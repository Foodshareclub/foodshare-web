import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  // Release auto-detected from git tag or SHA; override via NEXT_PUBLIC_SENTRY_RELEASE
  release:
    process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
    `dev-${new Date().toISOString().split("T")[0]}-${process.env.SENTRY_DSN?.split("/").pop() || "unknown"}`,
  // 👇 Enabled: Sentry is always on when DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session replay: never bulk-record (privacy + cost), always capture the
  // replay when an error occurs — the single highest-leverage debug artifact.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  // Debug mode enabled when SENTRY_DEBUG env var is set
  debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === "true",
  // Integration: automatically open issues/PRs from Sentry errors
  // This configures Sentry to automatically link errors to GitHub via the
  // Sentry GitHub integration (requires SENTRY_AUTH_TOKEN with repo scope)
  attachStacktrace: true,
  // Integration: Sentry GitHub issue creation
  // Automatically create GitHub issues from Sentry errors
  // Requires SENTRY_AUTH_TOKEN with repo scope and Sentry GitHub integration enabled
  // @see https://docs.sentry.io/platforms/javascript/guides/nextjs/#configure-github-integration
});
