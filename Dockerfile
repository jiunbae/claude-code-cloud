# Build stage
FROM node:22-alpine AS builder

# Install build dependencies for node-pty
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Next.js app
RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

# Install runtime dependencies for node-pty
RUN apk add --no-cache python3 make g++ linux-headers

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy server files (will be created later)
COPY --from=builder /app/src/server ./src/server

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose ports
EXPOSE 3000 3001

# Start application
CMD ["pnpm", "start:prod"]
