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

# Build WebSocket server TypeScript
RUN npx tsc \
    --outDir dist \
    --rootDir src \
    --esModuleInterop \
    --module commonjs \
    --target ES2022 \
    --resolveJsonModule \
    --skipLibCheck \
    --declaration false \
    --moduleResolution node \
    src/server/websocket-server.ts

# ===== Production Dependencies =====
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

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
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN groupadd --gid 1000 nodejs \
    && useradd --uid 1000 --gid nodejs --shell /bin/bash --create-home nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built Next.js app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Copy built WebSocket server
COPY --from=builder /app/dist ./dist

# Create data directory
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

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start both Next.js and WebSocket server
CMD ["sh", "-c", "node_modules/.bin/concurrently -n next,ws 'node_modules/.bin/next start' 'node dist/server/websocket-server.js'"]
