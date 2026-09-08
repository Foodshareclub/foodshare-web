import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://3467e48f7cb71ccbe4b0e96b0136da1b@o4509901022691328.ingest.de.sentry.io/4511957598797904",
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  // Release links events to commits/PRs (suspect commits, resolve-on-merge).
  // Injected at build time from CI (git SHA); unset locally.
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  // 100% tracing locally, 10% in prod — full-fidelity prod tracing is a
  // cost and latency liability; errors are still captured at 100%.
  tracesSampleRate: isProd ? 0.1 : 1.0,
  debug: false,
});
