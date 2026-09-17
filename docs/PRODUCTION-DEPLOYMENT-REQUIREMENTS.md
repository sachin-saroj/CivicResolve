# CivicResolve — Production Deployment Requirements & Runbook

**Document Version**: 1.0.0  
**Phase**: 29 — Security & Storage Hardening  
**Target Environment**: Linux / Docker / Cloud VM / Bare Metal  
**Last Updated**: 2026-09-17  

---

## 1. Executive Overview

CivicResolve is an online civic grievance redressal and tracking platform built on Node.js (Express + tRPC), React (Vite + TypeScript), and SQLite (Drizzle ORM + better-sqlite3). 

Following the Phase 29 Critical Security & Storage Hardening phase, CivicResolve operates with active database foreign keys, transactional integrity, local decoupled storage with path traversal protection and magic byte validation, HTTP security headers, and rate limiting.

This document details the configuration requirements, operational constraints, persistence guidelines, and deployment runbooks necessary to run CivicResolve reliably in production.

---

## 2. Environment Variables Specification

All configuration is provided via environment variables. In production, never commit `.env` files to source control.

| Variable | Type | Default | Production Requirement | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `development` | **`production`** | Optimizes React bundle serving, disables development error traces, and enables production security defaults. |
| `PORT` | Integer | `3000` | Optional (e.g. `3000` or `8080`) | TCP port for the HTTP/Express application server. |
| `SESSION_SECRET` | String | *Generated fallback* | **Required** (Min 32 random chars) | Cryptographic secret used for signing session cookies and tokens. |
| `DATABASE_URL` | String | `local.db` | **Required** (Persistent absolute path) | Path to SQLite database file. Must point to a persistent volume (e.g., `/data/civicresolve.db`). |
| `STORAGE_DRIVER` | String | `local` | `local` (or `s3` when extending) | Storage driver provider. Defaults to `local` disk storage. |
| `UPLOAD_DIR` | String | `./uploads` | **Required** (Persistent volume path) | Absolute or project-relative directory where case attachments and evidence are stored. Must be persistent across container recreations (e.g., `/data/uploads`). |
| `MAX_FILE_SIZE_BYTES`| Integer | `10485760` (10 MB)| Optional | Hard ceiling on individual attachment file sizes. |
| `RATE_LIMIT_WINDOW_MS`| Integer| `900000` (15 min) | Optional | Duration of window for API rate limiter. |
| `RATE_LIMIT_MAX_REQUESTS`| Integer| `300` | Optional | Maximum allowed requests per IP within the rate limit window. |
| `PORTAL_RATE_LIMIT_MAX` | Integer| `25` | Optional | Maximum allowed submissions/uploads on public portal endpoints per IP within 15 minutes. |
| `APP_URL` | String | `http://localhost:3000` | **Required** (e.g., `https://civicresolve.org`) | Canonical public URL used for absolute link generation and CORS enforcement. |

---

## 3. Database Architecture & Persistence (SQLite)

CivicResolve uses SQLite via `better-sqlite3` and `drizzle-orm`. In Phase 29, the database engine was hardened with specific pragmas and indexes.

### 3.1 Connection Pragmas
The application automatically executes the following pragmas upon startup:
```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

### 3.2 Volume Persistence
- **Container Deployments**: You **must** mount a persistent host volume or Docker named volume to the directory containing `DATABASE_URL`.
- Example: `-v /var/lib/civicresolve/data:/data` with `DATABASE_URL=/data/civicresolve.db`.
- **Never** store the SQLite database inside a temporary or ephemeral container layer.
- **WAL & SHM Files**: SQLite in WAL mode creates two temporary sibling files during runtime: `*.db-wal` and `*.db-shm`. Ensure the filesystem directory has full read/write permissions for the application user.

### 3.3 Concurrency & Scaling Considerations
- SQLite supports unlimited concurrent readers and **one concurrent writer**.
- CivicResolve uses WAL mode (`journal_mode = WAL`) combined with a 5000ms `busy_timeout` and exponential jitter retry logic for grievance sequence generation.
- **Scaling Limit**: SQLite in this configuration comfortably handles **several hundred concurrent users and up to 50-100 writes/sec** on NVMe storage. If civic volume exceeds this threshold, migrate the Drizzle schema to PostgreSQL.

### 3.4 Backup & Disaster Recovery Strategy
Never use standard file-copy (`cp`) on a live SQLite database while writes are occurring, as it risks capturing torn pages.

1. **Option A — SQLite Online Backup API (Recommended)**:
   Run a scheduled cron job using the SQLite CLI:
   ```bash
   sqlite3 /data/civicresolve.db ".backup '/backups/civicresolve_$(date +%Y%m%d_%H%M%S).db'"
   ```
2. **Option B — Litestream Continuous Streaming**:
   Use Litestream ([litestream.io](https://litestream.io)) to stream SQLite WAL changes continuously to an S3/GCS/MinIO bucket with sub-second RPO.
3. **Backup Retention**:
   - Hourly backups retained for 48 hours.
   - Daily backups retained for 30 days.
   - Monthly backups retained for 1 year.

---

## 4. File Storage Configuration

### 4.1 Local Storage Provider
- Files are saved to `UPLOAD_DIR` using randomized UUID keys (`grievances/<uuid>.<ext>`).
- Path traversal attacks (`../`, `%2e%2e/`, absolute path overrides) are strictly blocked at the `StorageProvider` layer using `path.resolve` boundary verification.
- In Docker environments, mount `UPLOAD_DIR` to persistent storage:
  ```bash
  -v /var/lib/civicresolve/uploads:/data/uploads
  ```

### 4.2 Security Validation
- All uploads pass strict MIME type inspection, file extension whitelisting (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`), and **magic byte buffer inspection** (header verification) to prevent executable spoofing.
- Public file access is controlled via `GET /api/attachments/:key`. Direct directory indexing of `uploads/` is disabled.

---

## 5. Reverse Proxy Configuration (Nginx / Caddy)

CivicResolve must be deployed behind an SSL-terminating reverse proxy.

### 5.1 Nginx Reference Configuration
```nginx
# /etc/nginx/sites-available/civicresolve.conf

upstream civicresolve_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name civicresolve.example.gov;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name civicresolve.example.gov;

    ssl_certificate /etc/letsencrypt/live/civicresolve.example.gov/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/civicresolve.example.gov/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 12M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://civicresolve_backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Health check bypass
    location /health {
        proxy_pass http://civicresolve_backend/health;
        access_log off;
    }
}
```

---

## 6. Health Checks & Monitoring

CivicResolve exposes dedicated REST health check endpoints:
- `GET /health`
- `GET /api/health`

### Response Payload:
```json
{
  "status": "healthy",
  "timestamp": "2026-09-17T18:00:00.000Z",
  "uptime": 3600.12,
  "database": "connected",
  "storage": "operational"
}
```

### Alerting Triggers:
- **Status != 200**: Service or database initialization failure.
- **Uptime reset**: Process restart / OOM kill.
- **Disk Usage > 85%**: Immediate action required on `DATABASE_URL` and `UPLOAD_DIR` volumes.

---

## 7. Deployment Runbook

### 7.1 Initial Deployment (Bare Metal / VM)
1. **System Prerequisites**: Node.js 20+ LTS, pnpm, SQLite3, Nginx, Certbot.
2. **Clone & Setup**:
   ```bash
   git clone https://github.com/sachin-saroj/CivicResolve.git /opt/civicresolve
   cd /opt/civicresolve
   pnpm install --frozen-lockfile
   ```
3. **Environment Setup**:
   Create `/opt/civicresolve/.env`:
   ```bash
   NODE_ENV=production
   PORT=3000
   SESSION_SECRET=<generated-64-hex-char-secret>
   DATABASE_URL=/var/lib/civicresolve/data/civicresolve.db
   UPLOAD_DIR=/var/lib/civicresolve/uploads
   APP_URL=https://civicresolve.example.gov
   ```
4. **Directory Permissions**:
   ```bash
   sudo mkdir -p /var/lib/civicresolve/data /var/lib/civicresolve/uploads /backups
   sudo chown -R civicapp:civicapp /var/lib/civicresolve /opt/civicresolve /backups
   ```
5. **Build Application**:
   ```bash
   pnpm run build
   ```
6. **Systemd Service (`/etc/systemd/system/civicresolve.service`)**:
   ```ini
   [Unit]
   Description=CivicResolve Web Service
   After=network.target

   [Service]
   Type=simple
   User=civicapp
   WorkingDirectory=/opt/civicresolve
   ExecStart=/usr/bin/node dist/index.js
   Restart=always
   RestartSec=5
   EnvironmentFile=/opt/civicresolve/.env

   [Install]
   WantedBy=multi-user.target
   ```
7. **Start & Enable**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now civicresolve
   ```

### 7.2 Zero-Downtime Rollout & Upgrade Procedure
1. Pull new code: `git pull origin main`
2. Install dependencies: `pnpm install --frozen-lockfile`
3. Run verification checks:
   ```bash
   pnpm check
   pnpm test
   ```
4. Build assets: `pnpm run build`
5. Create pre-upgrade database backup:
   ```bash
   sqlite3 /var/lib/civicresolve/data/civicresolve.db ".backup '/backups/pre_upgrade_$(date +%s).db'"
   ```
6. Restart service: `sudo systemctl restart civicresolve`
7. Verify health: `curl -f http://127.0.0.1:3000/health`
