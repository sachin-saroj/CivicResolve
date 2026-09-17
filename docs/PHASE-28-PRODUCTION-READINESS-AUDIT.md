# CivicResolve — Production Readiness Audit (Phase 28)

**Audit Date:** September 17, 2026  
**Auditor Roles:** Senior Software Architect, Security Engineer, Backend Engineer, Database Engineer, DevOps Engineer, QA Engineer  
**Repository:** [sachin-saroj/CivicResolve](https://github.com/sachin-saroj/CivicResolve)  
**Branch:** `main`  
**Starting Baseline Commit:** `f6219e1`  
**Verdict:** **NOT READY FOR PRODUCTION DEPLOYMENT** (Requires Remediation of 3 P0 Blockers and 6 P1 Issues)

---

## 1. Executive Summary

CivicResolve has achieved a cohesive visual and user experience following Phases 0 through 27, passing all current unit tests (48/48 passed) and TypeScript compilation (`tsc --noEmit`). However, a rigorous production-readiness audit across security, data integrity, architecture, and deployment engineering reveals that **the system cannot currently be safely and reliably deployed for real public and administrative users**.

### Primary Blockers Identified
1. **P0-1: Data Exposure & Unauthenticated Public Board:** The tRPC procedure `public.board` queries `db.listAssignedGrievances(0, input, "admin")` under unauthenticated access, exposing all internal grievance fields, citizen contact emails, locations, and internal case descriptions to any anonymous client on the public web.
2. **P0-2: Unauthenticated File Upload & Broken Storage Dependency:** Public attachment uploads (`portal.uploadAttachment`) and retrievals (`/manus-storage/*`) have zero authentication or authorization checks. Crucially, storage operations depend on an external proprietary "Forge" API (`BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`) which does not exist in standard hosting environments, causing runtime HTTP 500 errors on all file operations.
3. **P0-3: Database Referential Integrity Disabled & Missing Transactions:** SQLite foreign keys are disabled by default (`PRAGMA foreign_keys = OFF` is active because `PRAGMA foreign_keys = ON;` is never executed). Furthermore, zero database transactions (`db.transaction()`) are used across the application, allowing partial writes, orphaned history logs, and race conditions during case creation and officer assignment.

---

## 2. Repository Baseline

- **Repository Root:** `c:\Users\Asus\OneDrive\Desktop\grievance-redressal-system`
- **Framework:** Node.js (v20+), Express 4.21.2, tRPC v11.6.0, React 19.2.1, Vite 7.1.9, Wouter 3.3.5 (patched).
- **Styling:** Tailwind CSS v4.1, Radix UI primitives, Lucide React, Recharts.
- **Database & ORM:** SQLite / Turso via `@libsql/client` (0.17.4) and Drizzle ORM (0.44.5).
- **Authentication:** Dual-stack — Jose (HS256) JWT for internal staff session cookies (`civic_internal_session`), scrypt password hashing, and legacy OAuth fallback.
- **Git State:** Clean working directory on `main`, up to date with `origin/main` at `f6219e1`.

---

## 3. Architecture Audit

### Trust & Communication Boundaries
```
[ Browser / Public Citizen ] ──(HTTP JSON)──> [ Express 4.21 ] ──> [ tRPC Router ]
                                                     │                     │
                                             [ Storage Proxy ]      [ Auth Context ]
                                                     │                     │
                                                     ▼                     ▼
                                           [ External Forge S3 ]    [ Drizzle ORM ]
                                              (Hard Dependency)            │
                                                                           ▼
                                                                  [ SQLite: local.db ]
```

- **[Fact]** `server/_core/index.ts` mounts `express.json({ limit: "50mb" })`, `registerStorageProxy(app)`, `registerOAuthRoutes(app)`, and tRPC `/api/trpc` on a single Node.js HTTP server.
- **[Fact]** Background SLA escalation (`escalateOverdueGrievances()`) runs on an in-process `setInterval` every 15 minutes (`server/_core/index.ts#L67-72`).
- **[Inference]** Single Point of Failure: If the single Node.js process crashes, both user-facing traffic and the background SLA escalation worker terminate simultaneously. If deployed on multiple horizontal container instances, `setInterval` will run concurrently on every instance, triggering redundant uncoordinated database sweeps.

---

## 4. Authentication Audit

- **Staff Password Hashing:** Uses `scryptSync` with a 16-byte random salt and 64-byte key length (`server/internalAuth.ts#L14-18`). Verification utilizes `crypto.timingSafeEqual` (`server/internalAuth.ts#L26`). **[PASS]**
- **Session Management:** Signed HS256 JWT stored in HttpOnly cookie `civic_internal_session` with `sameSite: "lax"`, `path: "/"`, and dynamic `secure` flag based on HTTPS/x-forwarded-proto (`server/internalAuth.ts#L58-62`). **[PASS]**
- **Fallback Secret Insecurity:** If `ENV.cookieSecret` is not supplied, `server/internalAuth.ts#L29-33` silently falls back to a hardcoded string `civic-resolve-default-dev-secret-key-at-least-32-chars`. While `server/_core/env.ts` throws when `NODE_ENV === "production"`, any non-production staging or misconfigured container defaults to the shared hardcoded key.
- **Brute-Force Protection:** In-memory `Map` tracking failed attempts by email (5 attempts per 15 min window, `server/internalAuth.ts#L64-86`).
  - **[Inference]** Memory leak risk: Keys in `loginAttempts` are never pruned unless the exact same email attempts login again after expiration. Furthermore, memory state resets on process restart and is not shared across clusters.

---

## 5. Authorization & RBAC Audit

### Privilege Boundary Matrix

| Procedure | Level | Role Enforced | Ownership Verified? | Assessment |
| :--- | :--- | :--- | :--- | :--- |
| `auth.internalLogin` | Public | None | N/A | Rate-limited by email in-memory |
| `public.catalog` | Public | None | N/A | Safe: only active depts & categories |
| `public.board` | Public | **NONE** | **NONE** | **CRITICAL LEAK: Queries admin queue publicly** |
| `public.suggestions` | Public | **NONE** | **NONE** | **HIGH RISK: Auto-completes internal cases** |
| `public.lookup` | Public | None | Key lookup | Returns tracking metadata without PII |
| `portal.create` | Public | None | Public actor | Safe: assigns to synthetic public user |
| `portal.detail` | Public | None | None | **HIGH RISK: Returns contactEmail, officer info** |
| `portal.feedback` | Public | None | None | **HIGH RISK: Unauthenticated 1-time feedback hijack** |
| `portal.uploadAttachment` | Public | None | None | **CRITICAL: Arbitrary public upload to any case** |
| `officer.queue` | Protected | Officer/Admin | Scoped to Dept/Assignee | Properly scoped in `listAssignedGrievances` |
| `officer.updateCase` | Protected | Officer/Admin | Checked against Assignee | Enforces `assertWorkflowTransition` |
| `officer.bulkUpdate` | Protected | Officer/Admin | Checked against Assignee | Enforces ownership and transition |
| `admin.*` | Protected | Admin | Global | Restricts to `user.role === 'admin'` |

- **[Fact]** `public.board` (`server/routers.ts#L86-97`) calls `db.listAssignedGrievances(0, input, "admin")`. Any unauthenticated request receives full internal case records including `contactEmail`, `location`, and full citizen issue `description`.

---

## 6. Database Integrity Audit

### Referential Constraints & Pragmas
- **[Fact]** In `server/db.ts#L23-141`, `initTables` defines SQLite tables with `REFERENCES` clauses (e.g. `grievances(userId) REFERENCES users(id)`).
- **[Fact]** Nowhere in `server/db.ts` or `server/_core/index.ts` is `PRAGMA foreign_keys = ON;` executed.
- **[Fact]** SQLite defaults to `PRAGMA foreign_keys = OFF`.
- **[Inference]** Referential integrity is completely disabled in the SQLite engine. Foreign key constraints, cascade deletes, and restrict clauses defined in `schema.ts` are ignored at runtime.

### Missing Indexes
- **[Fact]** In `drizzle/schema.ts`, only primary keys, `users.openId`, `grievanceCategories(departmentId, name)`, `officerProfiles.userId`, `grievances.trackingNumber`, and `feedback.grievanceId` have unique indexes.
- **[Fact]** The `grievances` table has **NO secondary indexes** on:
  - `grievances.departmentId`
  - `grievances.assignedOfficerId`
  - `grievances.status`
  - `grievances.userId`
  - `grievances.dueAt`
  - `grievances.updatedAt`
- **[Inference]** All filtered queries, sorting, SLA escalation sweeps, and officer queue lookups require full table scans (`O(N)` complexity).

### Absence of Transactions
- **[Fact]** `grep_search` across `server/` reveals 0 occurrences of `db.transaction()` or `.transaction()`.
- **[Fact]** `admin.assign` (`server/routers.ts#L311-333`) performs up to 5 sequential asynchronous queries across `grievances`, `grievanceHistory`, `notifications`, and `users` without a transaction boundary.

---

## 7. Workflow Integrity Audit

- **[Fact]** Legal transitions are defined in `server/workflow.ts#L4-13`:
  ```ts
  submitted -> acknowledged -> assigned -> in_progress -> (resolved | escalated)
  escalated -> in_progress
  resolved -> (closed | reopened)
  reopened -> in_progress
  closed -> [terminal]
  ```
- **[Fact]** `assertWorkflowTransition` validates transition rules and prevents citizens from transitioning tickets unless reopening a resolved case (`server/workflow.ts#L15-33`).
- **[Fact]** Reopened tickets are properly transitioned back to `in_progress`.
- **[Inference]** State machine logic is sound and well-tested (all 7 workflow unit tests pass in `workflow.test.ts`). However, workflow transitions lack transaction atomicity when logging history records.

---

## 8. File Upload & Storage Security

- **[Fact]** File upload validation restricts MIME types to `application/pdf`, `image/jpeg`, `image/png`, and `image/webp` (`server/routers.ts#L44`).
- **[Fact]** Payload size is validated in tRPC (`fileData: z.string().max(2_800_000)`) and buffer length checked `<= 2MB` (`server/routers.ts#L133`).
- **[Fact]** File names are sanitized with regex: `input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")` (`server/routers.ts#L134`).
- **[Fact]** **Fatal Storage Dependency:** Storage functions `storagePut` and `storageGetSignedUrl` in `server/storage.ts` require `ENV.forgeApiUrl` and `ENV.forgeApiKey`. If unconfigured, calling either function immediately throws an unhandled error: `"Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"`.
- **[Fact]** Route `/manus-storage/*` in `server/_core/storageProxy.ts` does not authenticate callers. Any client with a guessed or scraped storage key can retrieve attachments.

---

## 9. Privacy & Data Exposure

- **[Fact]** `portal.detail` (`server/routers.ts#L123-127`) returns the full output of `getGrievanceDetail`:
  - `detail.grievance.contactEmail` (Complainant's personal email)
  - `detail.grievance.location` (Complainant's specific campus/residence location)
  - `detail.officer` (Assigned officer's internal ID, name, and work email)
  - `detail.history` (Internal remarks and actor IDs)
- **[Fact]** Tracking numbers are sequentially generated: `GRV-YYYY-00001`, `GRV-YYYY-00002` (`server/db.ts#L353`).
- **[Inference]** Predictable sequential tracking numbers combined with unauthenticated detailed endpoints enable automated enumeration and scraping of citizen PII.

---

## 10. Rate Limiting & Abuse Protection

- **[Fact]** Rate limiting is only implemented for `auth.internalLogin` via an in-memory map (`server/internalAuth.ts#L68-72`).
- **[Fact]** Zero rate limiting exists on:
  - `portal.create` (allows automated ticket flooding/spamming)
  - `portal.uploadAttachment` (allows automated storage filling)
  - `portal.detail` / `public.lookup` (allows rapid tracking ID harvesting)
  - `public.suggestions` / `public.board` (allows repeated heavy database querying)
  - `portal.feedback` (allows automated feedback poisoning)

---

## 11. Error Handling & Information Leakage

- **[Fact]** In `server/_core/index.ts`, Express error-handling middleware is not registered.
- **[Fact]** Uncaught errors in tRPC return structured JSON with tRPC error codes.
- **[Fact]** In non-production modes, tRPC may serialize internal error messages to client responses.

---

## 12. Reliability & Resilience

- **[Fact]** Database engine is local file-based SQLite (`file:./local.db`).
- **[Inference]** SQLite file concurrency: SQLite supports concurrent reads in WAL mode, but concurrent writes lock the database file. Heavy concurrent write traffic (e.g. 50+ concurrent users submitting tickets) will result in `SQLITE_BUSY` errors unless timeout busy-handlers or connection pooling queues are configured.
- **[Fact]** Zero graceful shutdown handlers (`process.on('SIGTERM')`, `process.on('SIGINT')`) exist to close database connections or HTTP sockets cleanly.

---

## 13. Performance

- **[Fact]** Client production bundle size (`dist/public/assets/index-DZe6l-1Y.js`): **1,098.29 kB** (gzip: 303.36 kB).
- **[Fact]** Vite issues a build warning: `(!) Some chunks are larger than 500 kB after minification.`
- **[Inference]** Heavy single bundle due to Recharts, Framer Motion, and Radix UI loaded in the main chunk without route-based dynamic code-splitting (`React.lazy`).
- **[Fact]** `public.board` and `officer.queue` default to in-memory array sorting (`server/db.ts#L484-491`) rather than SQL `ORDER BY` clauses when custom sort options are provided.

---

## 14. Dependency Security

`pnpm audit` execution identified **153 vulnerabilities** (11 low, 81 moderate, 58 high, 3 critical):
- **Critical CVE-1:** `fast-xml-parser` (GHSA-m7jm-9gc2-mpf2) pulled via `@aws-sdk/client-s3`.
- **Critical CVE-2:** `tar` (GHSA-23hp-3jrh-7fpw) pulled via `@tailwindcss/oxide`.
- **Critical CVE-3:** `vitest` (GHSA-5xrq-8626-4rwp) UI server file execution risk.
- **High CVEs:** `streamdown` -> `mermaid` -> `dompurify` prototype pollution and XSS bypasses.
- **[Fact]** `@aws-sdk/client-s3` and `streamdown` are completely unused in the application code and can be removed.

---

## 15. Environment Variables & Secrets

- **[Fact]** `.env` is properly ignored in `.gitignore` and is not tracked by Git.
- **[Fact]** Git history audit (`git log -S "JWT_SECRET"`) reveals no plaintext secrets committed to history.
- **[Fact]** `ENV.isProduction && !process.env.JWT_SECRET` check correctly enforces secret presence in production (`server/_core/env.ts#L12-14`).
- **[Finding]** Missing environment variables in `.env.example`: `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` are referenced in `server/storage.ts` but omitted from documentation.

---

## 16. CORS, Cookies & Security Headers

- **[Fact]** No HTTP security headers package (e.g. `helmet`) is installed or mounted in `server/_core/index.ts`.
- **[Fact]** Missing security headers:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options` (Clickjacking vulnerability)
  - `X-Content-Type-Options: nosniff` (MIME confusion vulnerability)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` (HSTS)
- **[Fact]** CORS is unconfigured in Express.

---

## 17. Logging & Observability

- **[Fact]** Logging relies exclusively on `console.log`, `console.warn`, and `console.error`.
- **[Fact]** Zero request IDs or correlation headers exist to trace requests across client, server, and database logs.
- **[Fact]** No external APM or error monitoring service (Sentry, Datadog, Prometheus) is integrated.
- **[Fact]** No standard REST HTTP health check endpoint (`/health` or `/api/health`) exists for container or load balancer probes. Only a tRPC `system.health` query exists, which requires encoded inputs.

---

## 18. Backup & Recovery

- **Status:** **MISSING**
- **[Fact]** The repository contains zero automated backup scripts, Litestream configurations, or backup documentation for the SQLite database.
- **[Inference]** In a containerized deployment without a persistent volume mount, any container restart or redeploy causes complete, irreversible loss of all database records.

---

## 19. Deployment Configuration

- **[Fact]** No `Dockerfile`, `docker-compose.yml`, or deployment configuration files exist in the repository.
- **[Fact]** Build script: `pnpm run build` generates `dist/index.js` (server) and `dist/public/` (client).
- **[Fact]** Start script: `node dist/index.js` runs the production server.
- **[Finding]** Dynamic port hunting: `findAvailablePort(3000)` hunts up to 20 ports if port 3000 is busy (`server/_core/index.ts#L25-32`). In containerized environments (Kubernetes, ECS, Cloud Run), the port must be strictly deterministic (`PORT=8080`); hunting ports can cause health check probe failures.

---

## 20. Test Coverage Audit

- **Existing Suite:** 13 test files, 48 tests. **All 48 tests pass.**
- **Strong Areas Covered:**
  - Password hashing and credential rejection (`internalAuth.test.ts`)
  - Workflow transitions and role permissions (`workflow.test.ts`)
  - SLA computation and overdue detection (`sla.test.ts`)
  - Officer queue filtering and department visibility scoping (`officer.queue.test.ts`, `staff.scope.test.ts`)
  - Session cookie clearing on logout (`auth.logout.test.ts`)
- **Critical Untested Areas:**
  - Attachment upload validation and file storage failures
  - Admin management endpoints (`createDepartment`, `createCategory`, `makeOfficer`, `assign`)
  - Concurrent ticket creation race conditions
  - Absence of database transaction rollbacks
  - Rate limiting behavior under burst traffic

---

## 21. Accessibility & SEO

- **[Fact]** Document titles are dynamically managed via `TitleManager` in `client/src/App.tsx`.
- **[Fact]** Navigation and key workflows pass keyboard navigation and focus management.
- **[Finding]** `client/index.html` lacks `<meta name="description">` and Open Graph social tags.
- **[Finding]** No `robots.txt` or `sitemap.xml` exists in `client/public/`.

---

## 22. Browser Smoke Test Verification

- Verified live on `http://localhost:3000` via autonomous browser subagent across 6 major flows:
  - Landing Page (`/` at 1440px desktop and 375px mobile): Functional, responsive.
  - Case Tracking (`/track`): Lookup for `GRV-2026-00001` succeeds, status rendered.
  - Case Submission (`/cases/new`): Client-side form step validation functions properly.
  - Staff Authentication (`/staff/login`): Authentication inputs and error handlers function.
  - Officer Case Board (`/manage`): Kanban and list views render with active filters.
  - Admin Overview (`/admin`): Metrics, SLA telemetry, and department distribution render.

---

## 23. Threat Model (STRIDE)

| Threat Category | Attack Vector | Affected Component | Severity |
| :--- | :--- | :--- | :---: |
| **Information Disclosure** | Scraping sequential tracking IDs to read emails and case details | `portal.detail`, `public.board` | **P0** |
| **Tampering** | Attaching arbitrary files to another citizen's case | `portal.uploadAttachment` | **P0** |
| **Denial of Service** | Flooding file upload or ticket creation endpoints without rate limiting | `portal.create`, `portal.uploadAttachment` | **P1** |
| **Elevation of Privilege** | Reassigning tickets or updating status across departments | `officer.updateCase`, `admin.assign` | **P1** |
| **Spoofing / Clickjacking** | Embedding portal or staff login in an iframe on a malicious site | Missing `X-Frame-Options` | **P2** |
| **Repudiation** | Mutating cases without atomic audit history logging | Missing DB transactions | **P1** |

---

## 24. Production Readiness Matrix

| Area | Status | Evidence | Risk Level |
| :--- | :---: | :--- | :---: |
| **Architecture** | PASS WITH CONDITIONS | Express + tRPC + React 19 architecture is clean; background cron coupled in-process | Medium |
| **Authentication** | PASS | Scrypt hashing, HS256 JWT, HttpOnly cookies, timing-safe equality | Low |
| **Authorization / RBAC** | NEEDS FIX | `public.board` exposes admin queue; `portal.uploadAttachment` lacks case ownership | **High** |
| **API Security** | NEEDS FIX | Public access to internal data; missing rate limiting on public mutations | **High** |
| **Database Integrity** | NEEDS FIX | `PRAGMA foreign_keys` disabled; 0 transactions; 0 secondary indexes | **High** |
| **Workflow Integrity** | PASS | State machine in `workflow.ts` strictly asserts legal transitions | Low |
| **File Security** | NEEDS FIX | Unauthenticated uploads and hard dependency on external Forge S3 API | **High** |
| **Privacy / Data Exposure**| NEEDS FIX | Complainant email and officer info exposed in unauthenticated responses | **High** |
| **Rate Limiting** | NEEDS FIX | Only login has rate limiting; public write and lookup endpoints unprotected | Medium |
| **Error Handling** | PASS WITH CONDITIONS | tRPC catches errors; missing global Express error middleware | Medium |
| **Reliability** | NEEDS FIX | No graceful shutdown; SQLite concurrent write lock risks | Medium |
| **Performance** | PASS WITH CONDITIONS | Large 1.1MB initial bundle; in-memory sorting on queues | Medium |
| **Dependencies** | NEEDS FIX | Unused `@aws-sdk/client-s3` and `streamdown` pull in critical CVEs | **High** |
| **Secrets Management** | PASS | `.env` untracked, production guards present | Low |
| **Security Headers** | NEEDS FIX | Missing Helmet, CSP, X-Frame-Options, HSTS | Medium |
| **Logging / Observability**| NEEDS FIX | Raw console logs only; no REST health check endpoint | Medium |
| **Backup & Recovery** | NEEDS FIX | Zero backup mechanisms or disaster recovery documentation | **High** |
| **Deployment Config** | PASS WITH CONDITIONS | Build/start scripts work; no Dockerfile or healthcheck | Medium |
| **Testing** | PASS WITH CONDITIONS | 48/48 unit tests pass; missing integration tests for admin & file uploads | Medium |
| **Accessibility & SEO** | PASS WITH CONDITIONS | WCAG AA accessible; missing meta description and robots.txt | Low |

---

## 25. Finding Classification

### P0 Findings (Production Blockers)

#### [P0-1] Unauthenticated `public.board` Procedure Exposes Full Database
- **Area:** API Security / Privacy
- **Evidence:** `server/routers.ts#L86-97`: `board: publicProcedure.query(({ input }) => db.listAssignedGrievances(0, input, "admin"))`
- **Affected Component:** `server/routers.ts`, `server/db.ts`
- **Affected Role:** Citizen, Unauthenticated Public
- **Impact:** Any user or bot can query `public.board` to scrape all grievances across all departments, harvesting citizen emails, private issue descriptions, locations, and officer details.
- **Remediation:** Remove `public.board` or replace it with an aggregated anonymous metric endpoint (e.g. counts per department). Protect raw case queues strictly under `officerProcedure` or `adminProcedure`.
- **Confidence:** 100%

#### [P0-2] File Storage Architecture Dependent on Non-Existent External Forge API
- **Area:** File Security / Architecture
- **Evidence:** `server/storage.ts#L7-18`: `getForgeConfig()` throws error if `BUILT_IN_FORGE_API_URL` or `BUILT_IN_FORGE_API_KEY` is missing.
- **Affected Component:** `server/storage.ts`, `server/_core/storageProxy.ts`
- **Affected Role:** Citizen, Officer, Admin
- **Impact:** In standard cloud environments (AWS, Railway, Vercel, Docker), file uploads crash with HTTP 500. Furthermore, `/manus-storage/*` allows unauthenticated file downloads without case authorization.
- **Remediation:** Replace Forge dependency with standard local disk storage (`uploads/` directory served with static authorization) or native AWS S3 / Cloudflare R2 client. Ensure download authorization checks case access permissions.
- **Confidence:** 100%

#### [P0-3] SQLite Foreign Keys Disabled & Zero Database Transactions
- **Area:** Database Integrity / Reliability
- **Evidence:** Absence of `PRAGMA foreign_keys = ON;` in `server/db.ts`; zero calls to `db.transaction()` across `server/`.
- **Affected Component:** `server/db.ts`, `server/routers.ts`
- **Affected Role:** All
- **Impact:** Orphaned records can be written without constraint checks; multi-step operations (e.g. `admin.assign`, `createGrievanceRecord`) fail partially under concurrent access or process interruption, corrupting history and workflow state.
- **Remediation:** Execute `PRAGMA foreign_keys = ON;` on SQLite connection initialization. Wrap multi-table mutations in `db.transaction()`.
- **Confidence:** 100%

---

### P1 Findings (Serious Security / Reliability Issues)

#### [P1-1] Citizen PII Exposure via Sequential Tracking Enumeration
- **Area:** Privacy / Authorization
- **Evidence:** `server/routers.ts#L123-127` (`portal.detail`) and `server/db.ts#L420-458` (`getGrievanceDetail`).
- **Impact:** Sequential tracking numbers (`GRV-2026-00001`...) allow automated scraping of citizen emails and full residential/campus locations.
- **Remediation:** Mask personal emails in public responses (e.g. `s***@college.edu`), omit internal officer email addresses from public view, and consider using cryptographically random tracking suffixes (e.g. `GRV-2026-K8F2X`).
- **Confidence:** 100%

#### [P1-2] Unauthenticated Arbitrary File Upload to Any Grievance
- **Area:** Authorization / File Security
- **Evidence:** `server/routers.ts#L128-140` (`portal.uploadAttachment`).
- **Impact:** Anyone with a tracking reference can upload arbitrary files to an existing case, poisoning evidence.
- **Remediation:** Require a secure submission access token (generated at creation) to allow subsequent citizen file attachments, or restrict attachments to initial submission time.
- **Confidence:** 95%

#### [P1-3] Unauthenticated Feedback Hijack
- **Area:** Business Logic / Integrity
- **Evidence:** `server/routers.ts#L122` (`portal.feedback`) and `server/db.ts#L295-306`.
- **Impact:** Any anonymous user who looks up a resolved grievance can submit the single available feedback rating before the actual complainant does, skewing CSAT metrics.
- **Remediation:** Validate feedback submission against a signed submission token or verify email before accepting public feedback.
- **Confidence:** 95%

#### [P1-4] Missing Secondary Indexes on Grievance Table
- **Area:** Performance / Database
- **Evidence:** `drizzle/schema.ts#L78-106`.
- **Impact:** Database degrades to full table scans on every officer queue load, status filter, and SLA escalation sweep as table size exceeds a few thousand records.
- **Remediation:** Add indexes on `(departmentId, status)`, `assignedOfficerId`, `userId`, and `dueAt`.
- **Confidence:** 100%

#### [P1-5] Absence of Rate Limiting on Public Write & Search Endpoints
- **Area:** Abuse Protection / Availability
- **Evidence:** Only `internalLogin` has rate limiting (`server/internalAuth.ts#L68`).
- **Impact:** Susceptible to automated spam submission, tracking lookup enumeration, and DDoS.
- **Remediation:** Introduce Express rate limiting (`express-rate-limit`) on `/api/trpc` with stricter limits on `portal.create` and `portal.uploadAttachment`.
- **Confidence:** 100%

#### [P1-6] Critical CVEs in Unused Dependencies
- **Area:** Supply Chain Security
- **Evidence:** `pnpm audit` reports 153 vulnerabilities; `@aws-sdk/client-s3` (pulls `fast-xml-parser`) and `streamdown` (pulls `dompurify` and `mermaid`) are unused in application code.
- **Impact:** Expands attack surface and triggers compliance audit failures.
- **Remediation:** Remove unused packages from `package.json` and prune lockfile.
- **Confidence:** 100%

---

### P2 Findings (Important Production Improvements)

- **[P2-1] Missing HTTP Security Headers:** Express server does not mount `helmet`, leaving application vulnerable to clickjacking (`X-Frame-Options`) and MIME sniffing.
- **[P2-2] Missing Standard REST Health Check Endpoint:** No `/health` or `/api/health` HTTP GET route exists for container or load balancer health checks.
- **[P2-3] Missing Graceful Shutdown:** Node.js process does not trap `SIGTERM` or `SIGINT` to flush pending database writes before terminating.
- **[P2-4] Large Client Bundle (1.1 MB):** Main client JS bundle exceeds recommended size limits; requires route-level lazy loading (`React.lazy`).
- **[P2-5] Missing Automated Database Backups:** No backup strategy or disaster recovery documentation exists for `local.db`.
- **[P2-6] In-Memory Sorting in Queues:** `server/db.ts#L484-491` sorts results in JavaScript arrays rather than database SQL `ORDER BY`.

---

### P3 Findings (Technical Debt & Polish)

- **[P3-1] In-Memory Login Rate Limiter Cleanup:** Stale IP/email entries in `loginAttempts` Map are not periodically purged.
- **[P3-2] Missing SEO / Meta Tags:** `client/index.html` lacks `<meta name="description">`, Open Graph tags, and `robots.txt`.
- **[P3-3] Dynamic Port Hunting in Production:** `findAvailablePort` hunts ports when port 3000 is occupied, which can confuse orchestration health probes.

---

## 26. Dependency Map

```
[ Unused Dependencies: @aws-sdk, streamdown ] ──> [ Critical CVEs (pnpm audit) ]
                                                            │
[ Missing Storage Configuration (Forge API) ] ──> [ Storage Failure (HTTP 500) ]
                                                            │
[ Public Procedures: public.board, portal.detail ] ──> [ Citizen PII Data Leakage ]
                                                            │
[ Sequential Tracking (GRV-YYYY-XXXXX) ] ──> [ Enumeration & Feedback Hijacking ]
                                                            │
[ Disabled Foreign Keys & Zero Transactions ] ──> [ Database Inconsistency Risk ]
```

---

## 27. Remediation Roadmap

### Phase 29: Critical Security & Privacy Hardening
1. **Remove Unsafe Endpoints:** Remove `public.board` and `public.suggestions`; restrict internal queue queries to authenticated officers/admins.
2. **PII Masking:** Mask complainant email in `portal.detail` (`s***@domain.com`) and remove internal officer contacts from unauthenticated views.
3. **Storage Decoupling:** Replace Forge API dependency with a self-contained local disk or S3-compatible driver with authorized download tokens.
4. **Rate Limiting:** Implement `express-rate-limit` on all public write endpoints (`portal.create`, `portal.uploadAttachment`, `portal.feedback`).
5. **Security Headers:** Install and configure `helmet` (CSP, `nosniff`, `DENY` frames, `HSTS`).

### Phase 30: Database Integrity & Performance Tuning
1. **Enable Foreign Keys:** Execute `PRAGMA foreign_keys = ON;` in `server/db.ts` upon client initialization.
2. **Transaction Wrapping:** Wrap all multi-step mutations (`admin.assign`, `createGrievanceRecord`, `updateGrievanceWorkflow`) in Drizzle transactions.
3. **Database Indexing:** Add composite and single indexes on `grievances(departmentId, status)`, `assignedOfficerId`, `userId`, and `dueAt`.
4. **Dependency Cleanup:** Prune unused packages (`@aws-sdk/client-s3`, `streamdown`) from `package.json`.

### Phase 31: Reliability, Observability & Production Deployment
1. **REST Health Endpoint:** Add standard `GET /health` route returning `{ status: "ok", db: "connected" }`.
2. **Graceful Shutdown:** Implement `SIGTERM`/`SIGINT` listeners to cleanly close server and database connections.
3. **Code Splitting:** Apply `React.lazy()` to dashboard and admin routes to reduce initial JS chunk below 500 kB.
4. **Dockerization:** Create production multi-stage `Dockerfile` and `docker-compose.yml` with persistent volume mount for `local.db`.

---

## 28. Final Recommendation

**Deploy to Production:** **NO**  
**Action Required:** Execute **Phase 29 (Critical Security Hardening)** and **Phase 30 (Database Integrity)** prior to exposing CivicResolve to real users or public networks.
