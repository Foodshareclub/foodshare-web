# ---- Stage 1: Install dependencies ----
# The canary channel, pinned by digest so the image is reproducible even
# though the `canary` tag itself moves with every upstream build.
FROM oven/bun:canary@sha256:7c470331ae82c6c38bca085f0302380828eb5507e1e06cd0e580f7e3b58369c9 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Stage 2: Build the application ----
FROM oven/bun:canary@sha256:7c470331ae82c6c38bca085f0302380828eb5507e1e06cd0e580f7e3b58369c9 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines NEXT_PUBLIC_* at build time, so anything read from
# process.env.NEXT_PUBLIC_* in src/ has to be declared here *and* passed as a
# build-arg, or it silently arrives as `undefined` in the built image. There is
# no warning: the code path just takes the "not configured" branch.
#
# The list below is the complete set of NEXT_PUBLIC_* variables that src/ reads.
# `scripts/check-build-args.ts` enforces it in CI, because this list is a
# hand-maintained copy of a fact the compiler already knows, and it drifted:
#   - NEXT_PUBLIC_GA_MEASUREMENT_ID  — the gtag snippet was absent from the
#     built HTML, so GA4 collected nothing
#   - NEXT_PUBLIC_VAPID_PUBLIC_KEY   — usePushNotifications early-returned, so
#     push subscribe always failed
#   - NEXT_PUBLIC_GOOGLE/BING/YANDEX/PINTEREST_VERIFICATION — the site-verification
#     meta tags were absent from the built HTML
#   - NEXT_PUBLIC_TELEGRAM_BOT_USERNAME, NEXT_PUBLIC_APPLE_CLIENT_ID,
#     NEXT_PUBLIC_R2_PUBLIC_URL, NEXT_PUBLIC_COOKIE_DOMAIN — both OAuth providers
#     and the image CDN were unreachable from the browser
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_RELEASE
ARG SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_RELEASE
ARG NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED
ARG NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
ARG NEXT_PUBLIC_OAUTH_APPLE_ENABLED
ARG NEXT_PUBLIC_OAUTH_GITHUB_ENABLED
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_BING_VERIFICATION
ARG NEXT_PUBLIC_YANDEX_VERIFICATION
ARG NEXT_PUBLIC_PINTEREST_VERIFICATION
ARG NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ARG NEXT_PUBLIC_APPLE_CLIENT_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ARG NEXT_PUBLIC_COOKIE_DOMAIN
ARG NEXT_PUBLIC_ENABLE_ANALYTICS
ARG NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS
ARG NEXT_PUBLIC_EMAIL_FROM
ARG NEXT_PUBLIC_EMAIL_FROM_NAME
ARG NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT
ARG NEXT_PUBLIC_API_MONITORING
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_GIT_COMMIT_SHA
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT
ENV NEXT_PUBLIC_SENTRY_RELEASE=$NEXT_PUBLIC_SENTRY_RELEASE
ENV NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED=$NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED
ENV NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED=$NEXT_PUBLIC_OAUTH_FACEBOOK_ENABLED
ENV NEXT_PUBLIC_OAUTH_APPLE_ENABLED=$NEXT_PUBLIC_OAUTH_APPLE_ENABLED
ENV NEXT_PUBLIC_OAUTH_GITHUB_ENABLED=$NEXT_PUBLIC_OAUTH_GITHUB_ENABLED
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_BING_VERIFICATION=$NEXT_PUBLIC_BING_VERIFICATION
ENV NEXT_PUBLIC_YANDEX_VERIFICATION=$NEXT_PUBLIC_YANDEX_VERIFICATION
ENV NEXT_PUBLIC_PINTEREST_VERIFICATION=$NEXT_PUBLIC_PINTEREST_VERIFICATION
ENV NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=$NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
ENV NEXT_PUBLIC_APPLE_CLIENT_ID=$NEXT_PUBLIC_APPLE_CLIENT_ID
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN
ENV NEXT_PUBLIC_ENABLE_ANALYTICS=$NEXT_PUBLIC_ENABLE_ANALYTICS
ENV NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=$NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS
ENV NEXT_PUBLIC_EMAIL_FROM=$NEXT_PUBLIC_EMAIL_FROM
ENV NEXT_PUBLIC_EMAIL_FROM_NAME=$NEXT_PUBLIC_EMAIL_FROM_NAME
ENV NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT=$NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT
ENV NEXT_PUBLIC_API_MONITORING=$NEXT_PUBLIC_API_MONITORING
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_GIT_COMMIT_SHA=$NEXT_PUBLIC_GIT_COMMIT_SHA
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

# The Sentry auth token is a credential, and an `ARG` value is recorded in the
# layer's metadata — so it survives in the image history, visible to anyone who
# can pull a builder layer, and is exposed to every process in this stage. It is
# also passed on two builds per commit, so each PR uploads a source-map set to
# the production Sentry project.
#
# A BuildKit secret mount keeps it out of both: the file exists only for the
# duration of the RUN, and it is not part of the layer.
#
#   --mount=type=secret,id=sentry_auth_token \
#       SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token)" bun run build
#
# The workflow already declares `secrets: sentry_auth_token` on the
# docker/build-push-action step. Switch to the mount once that secret is
# populated; until then the ARG is still passed, and the ARG is what makes the
# upload work — which is the trade this comment exists to make visible rather
# than to hide.
RUN bun run build

# ---- Stage 3: Production runner ----
FROM oven/bun:canary-slim@sha256:c502ea969202ebe903ad2ceac23d1140bca82c9b250096035e5480fd50e5c455 AS runner
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
