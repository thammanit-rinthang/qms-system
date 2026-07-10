# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json .npmrc* ./
# Install all deps — skip postinstall (prisma generate) until schema is available
RUN npm ci --ignore-scripts --loglevel=verbose

COPY . .

# Generate Prisma client now that schema.prisma is present
RUN npx prisma generate

# Build Next.js (npm run build already calls set-runtime.js internally)
RUN NEXT_TELEMETRY_DISABLED=1 npm run build -- --no-lint

# ── Stage 2: Production runner ─────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Copy generated Prisma client (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health/ready || exit 1

CMD ["node", "--enable-source-maps", "server.js"]
