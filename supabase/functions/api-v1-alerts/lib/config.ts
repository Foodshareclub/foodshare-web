/**
 * Alerts Configuration
 *
 * Thresholds, version, and feature flags for api-v1-alerts.
 * Extracted from `api-v1-alerts/index.ts` — no changes.
 */

export const CONFIG = {
  version: "2.1.0",
  alertCooldownMinutes: 15,
  defaultThresholds: {
    errorRatePercent: 5,
    p95LatencyMs: 2000,
    failedLoginMultiplier: 10,
    connectionPoolPercent: 80,
    vaultFailuresPerHour: 5,
  },
  // Sentry → GitHub auto-issues: only fire on new error/fatal issues to avoid spam.
  sentryGitHubEnabled: (Deno.env.get("SENTRY_GITHUB_REPO") || "") !== "" &&
    (Deno.env.get("GITHUB_TOKEN") || "") !== "",
};
