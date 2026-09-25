# Multi-stage production build for CivicResolve
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

# Cache dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Compile client SPA and server backend bundle
RUN pnpm run build

# Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_URL=file:/data/civicresolve.db \
    UPLOAD_DIR=/uploads

# Install curl for health check probe
RUN apk add --no-cache curl ca-certificates

# Create persistent storage mountpoints
RUN mkdir -p /data /uploads

# Copy compiled artifacts and production dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Automated container health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

VOLUME ["/data", "/uploads"]

CMD ["node", "dist/index.js"]
