import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.SENTRY_RELEASE,
  // 👇 Enabled: Sentry is always on when DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 100% tracing locally, 10% in prod — errors still capture at 100%.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session replay: never bulk-record (privacy + cost), always capture the
  // replay when an error occurs — the single highest-leverage debug artifact.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  // Debug mode: enabled when SENTRY_DEBUG env var is set
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
});
