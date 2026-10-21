/**
 * Alerts Route Handlers (check runner + GET/POST dispatch)
 *
 * Extracted from `api-v1-alerts/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import type { createHealthHandler } from "../../_shared/health-handler.ts";
import { logger } from "../../_shared/logger.ts";
import {
  checkCircuitBreakers,
  checkConnectionPool,
  checkErrorRate,
  checkLatency,
  checkLoginSpike,
  checkVaultFailures,
} from "./checks.ts";
import { CONFIG } from "./config.ts";
import { filterByAlertCooldowns, getSecretSafe, logAlerts, sendSlackAlert } from "./notify.ts";
import type { CheckAlertsRequest } from "./schemas.ts";
import type { AlertCondition, AlertResult, AlertThresholds } from "./types.ts";
import { handleSentryWebhook } from "./webhooks/sentry.ts";
import { handleXcodeCloudWebhook } from "./webhooks/xcode-cloud.ts";

export async function handleCheckAlerts(
  ctx: HandlerContext<CheckAlertsRequest>,
): Promise<Response> {
  const { supabase, body, ctx: requestCtx } = ctx;
  const startTime = performance.now();
  const forceCheck = body?.force === true;

  logger.info("Checking alerts", {
    force: forceCheck,
    requestId: requestCtx?.requestId,
  });

  // Load thresholds from environment or use defaults
  const thresholds: AlertThresholds = {
    errorRatePercent: parseFloat(
      Deno.env.get("ALERT_ERROR_RATE_PERCENT") ||
        String(CONFIG.defaultThresholds.errorRatePercent),
    ),
    p95LatencyMs: parseInt(
      Deno.env.get("ALERT_P95_LATENCY_MS") ||
        String(CONFIG.defaultThresholds.p95LatencyMs),
    ),
    failedLoginMultiplier: parseFloat(
      Deno.env.get("ALERT_LOGIN_SPIKE_MULTIPLIER") ||
        String(CONFIG.defaultThresholds.failedLoginMultiplier),
    ),
    connectionPoolPercent: parseInt(
      Deno.env.get("ALERT_CONNECTION_POOL_PERCENT") ||
        String(CONFIG.defaultThresholds.connectionPoolPercent),
    ),
    vaultFailuresPerHour: parseInt(
      Deno.env.get("ALERT_VAULT_FAILURES_HOUR") ||
        String(CONFIG.defaultThresholds.vaultFailuresPerHour),
    ),
  };

  // Run all checks in parallel
  const [
    errorRateAlert,
    latencyAlert,
    circuitBreakerAlerts,
    loginSpikeAlert,
    vaultFailuresAlert,
    connectionPoolAlert,
  ] = await Promise.all([
    checkErrorRate(supabase, thresholds),
    checkLatency(supabase, thresholds),
    checkCircuitBreakers(supabase),
    checkLoginSpike(supabase, thresholds),
    checkVaultFailures(supabase, thresholds),
    checkConnectionPool(supabase, thresholds),
  ]);

  // Collect all triggered alerts
  const alerts: AlertCondition[] = [
    errorRateAlert,
    latencyAlert,
    ...circuitBreakerAlerts,
    loginSpikeAlert,
    vaultFailuresAlert,
    connectionPoolAlert,
  ].filter((a): a is AlertCondition => a !== null);

  logger.info("Alert check complete", {
    total: 6,
    triggered: alerts.length,
  });

  // Send notifications
  const notificationsSent: string[] = [];

  if (alerts.length > 0) {
    const alertsToSend = forceCheck ? alerts : await filterByAlertCooldowns(supabase, alerts);

    if (alertsToSend.length > 0) {
      const slackWebhook = await getSecretSafe(supabase, "SLACK_WEBHOOK_URL");

      if (slackWebhook) {
        const slackSent = await sendSlackAlert(slackWebhook, alertsToSend);
        if (slackSent) notificationsSent.push("slack");
      }

      await logAlerts(supabase, alertsToSend);
    }
  }

  const result: AlertResult = {
    checked_at: new Date().toISOString(),
    alerts_triggered: alerts.length,
    alerts,
    notifications_sent: notificationsSent,
  };

  logger.info("Alert check completed", {
    durationMs: Math.round(performance.now() - startTime),
    alertsTriggered: alerts.length,
  });

  return ok(result, ctx);
}

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  function handleGet(ctx: HandlerContext): Promise<Response> {
    const url = new URL(ctx.request.url);
    const path = url.pathname;

    if (path.endsWith("/health")) {
      return healthCheck(ctx);
    }

    // GET / — run alert checks (cron compat)
    return handleCheckAlerts(ctx as HandlerContext<CheckAlertsRequest>);
  }

  function handlePost(ctx: HandlerContext): Promise<Response> {
    const url = new URL(ctx.request.url);
    const path = url.pathname;

    if (path.endsWith("/webhook/xcode-cloud") || path.endsWith("/webhook/xcodecloud")) {
      return handleXcodeCloudWebhook(ctx);
    }

    if (path.endsWith("/webhook/sentry")) {
      return handleSentryWebhook(ctx);
    }

    // POST / — run alert checks
    return handleCheckAlerts(ctx as HandlerContext<CheckAlertsRequest>);
  }

  return { handleGet, handlePost };
}
