# ---- Stage 1: Install dependencies ----
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY patches/ patches/
RUN bun install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV BUILD_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build

# ---- Stage 3: Production runner ----
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Don't run as root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public
# Copy i18n messages (next-intl)
COPY --from=builder /app/messages ./messages

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
