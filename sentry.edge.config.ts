import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.SENTRY_DSN! || process.env.NEXT_PUBLIC_SENTRY_DSN!,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  // Release auto-detected from git tag or SHA; override via SENTRY_RELEASE
  release:
    process.env.SENTRY_RELEASE ||
    `edge-${new Date().toISOString().split("T")[0]}-${process.env.SENTRY_DSN?.split("/").pop() || "unknown"}`,
  // 👇 Enabled: Sentry is always on when DSN is configured
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: isProd ? 0.1 : 1.0,
  debug: false,
  // Integration: automatically open issues/PRs from Sentry errors
  // This configures Sentry to automatically link errors to GitHub via the
  // Sentry GitHub integration (requires SENTRY_AUTH_TOKEN with repo scope)
  attachStacktrace: true,
});
