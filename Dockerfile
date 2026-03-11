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

# Next.js inlines NEXT_PUBLIC_* at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED
ARG NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
ARG NEXT_PUBLIC_OAUTH_APPLE_ENABLED
ARG NEXT_PUBLIC_OAUTH_GITHUB_ENABLED

ENV BUILD_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=$NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED
ENV NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED=$NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
ENV NEXT_PUBLIC_OAUTH_APPLE_ENABLED=$NEXT_PUBLIC_OAUTH_APPLE_ENABLED
ENV NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=$NEXT_PUBLIC_OAUTH_GITHUB_ENABLED

RUN bun run build

# ---- Stage 3: Production runner ----
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Install curl for healthchecks, dumb-init for proper process signal handling, and ca-certificates for HTTPS
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Don't run as root
RUN groupadd --system --gid 1001 bunjs && \
    useradd --system --uid 1001 --gid bunjs nextjs

# Copy standalone server
COPY --from=builder --chown=nextjs:bunjs /app/.next/standalone ./
# Copy static assets
COPY --from=builder --chown=nextjs:bunjs /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder --chown=nextjs:bunjs /app/public ./public
# Copy i18n messages (next-intl)
COPY --from=builder --chown=nextjs:bunjs /app/messages ./messages

# Create cache directory with correct permissions
RUN mkdir -p .next/cache && chown -R nextjs:bunjs .next/cache

USER nextjs

EXPOSE 3000

# Use dumb-init to handle PID 1 signals gracefully
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bun", "run", "server.js"]
