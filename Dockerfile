# syntax=docker/dockerfile:1

# ===== Base Stage =====
FROM node:20-bookworm-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install build dependencies for native modules (node-pty, better-sqlite3, bcrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ===== Dependencies Stage =====
FROM base AS deps

COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ===== Builder Stage =====
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN pnpm build

# ===== Runtime Stage =====
FROM node:20-bookworm-slim AS runner

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    # For Claude CLI (node-based)
    curl \
    git \
    # General utilities
    ca-certificates \
    procps \
    # For entrypoint user switching
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user (node user already exists with UID/GID 1000 in the base image)
# Rename and reconfigure the existing node user
RUN usermod -l nodejs -d /home/nodejs -m node 2>/dev/null || true \
    && groupmod -n nodejs node 2>/dev/null || true \
    && mkdir -p /home/nodejs && chown -R 1000:1000 /home/nodejs

WORKDIR /app

# Copy all dependencies (including tsx for runtime TypeScript execution)
COPY --from=deps /app/node_modules ./node_modules

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# Copy server source files (will be executed with tsx at runtime)
COPY --from=builder /app/src ./src

# Create entrypoint script (supports both root and non-root execution)
RUN echo '#!/bin/sh\n\
set -e\n\
# Create directories (will work if we have permissions)\n\
mkdir -p /app/data/db /app/data/sessions 2>/dev/null || true\n\
# Create workspace directories if writable\n\
if [ -w "${WORKSPACE_ROOT:-/workspace}" ]; then\n\
  mkdir -p "${WORKSPACE_ROOT:-/workspace}/workspaces" 2>/dev/null || true\n\
fi\n\
# If running as root, switch to nodejs; otherwise run directly\n\
if [ "$(id -u)" = "0" ]; then\n\
  chown -R nodejs:nodejs /app/data 2>/dev/null || true\n\
  exec gosu nodejs "$@"\n\
else\n\
  exec "$@"\n\
fi' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory (will be overlaid by volume mount, entrypoint recreates at runtime)
RUN mkdir -p /app/data/db /app/data/sessions && chown -R nodejs:nodejs /app

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV WS_PORT=3001
ENV PTY_API_PORT=3003
ENV DATABASE_PATH=/app/data/db/claude-cloud.db

# Expose ports
EXPOSE 3000 3001 3003

# Note: We don't use USER nodejs here because entrypoint needs root
# to create directories, then switches to nodejs via su-exec

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Entrypoint to setup directories at runtime
ENTRYPOINT ["docker-entrypoint.sh"]

# Start both Next.js and WebSocket server (use tsx for TypeScript)
CMD ["sh", "-c", "node_modules/.bin/concurrently -n next,ws 'node_modules/.bin/next start' 'node_modules/.bin/tsx src/server/websocket-server.ts'"]
