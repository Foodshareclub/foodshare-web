import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN! || process.env.NEXT_PUBLIC_SENTRY_DSN!,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  // 👇 Enabled: Sentry is always on when DSN is configured
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: isProd ? 0.1 : 1.0,
  debug: false,
});
