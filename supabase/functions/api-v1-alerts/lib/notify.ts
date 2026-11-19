/**
 * Alert Notification Functions
 *
 * Slack fan-out, alert log, cooldown filter, audited secret access.
 * Extracted from `api-v1-alerts/index.ts` — no logic changes.
 */

import { ServerError } from "../../_shared/errors.ts";
import { logger } from "../../_shared/logger.ts";
import { CircuitBreakerError, withCircuitBreaker } from "../../_shared/circuit-breaker.ts";
import { getSupabaseClient } from "../../_shared/supabase.ts";
import { CONFIG } from "./config.ts";
import type { AlertCondition } from "./types.ts";

type Supabase = ReturnType<typeof getSupabaseClient>;

export async function sendSlackAlert(
  webhookUrl: string,
  alerts: AlertCondition[],
): Promise<boolean> {
  try {
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    const color = criticalCount > 0 ? "#dc3545" : "#ffc107";
    const emoji = criticalCount > 0 ? ":rotating_light:" : ":warning:";

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} Foodshare Alert: ${criticalCount} critical, ${warningCount} warning`,
          emoji: true,
        },
      },
      { type: "divider" },
      ...alerts.map((alert) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            `*${alert.severity.toUpperCase()}* - ${alert.type}\n${alert.message}\n_Value: ${alert.value} (threshold: ${alert.threshold})_`,
        },
      })),
      {
        type: "context",
        elements: [{
          type: "mrkdwn",
          text: `Timestamp: ${new Date().toISOString()}`,
        }],
      },
    ];

    const response = await withCircuitBreaker(
      "slack-alerts",
      async () => {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attachments: [{ color, blocks }] }),
        });
        if (!res.ok) {
          throw new ServerError(`Slack webhook HTTP ${res.status}`);
        }
        return res;
      },
      { failureThreshold: 3, resetTimeoutMs: 120_000 },
    );

    return response.ok;
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Slack circuit breaker open, skipping alert", {
        retryAfterMs: error.retryAfterMs,
      });
    } else {
      logger.error("Error sending Slack alert", { error });
    }
    return false;
  }
}

export async function logAlerts(
  _supabase: Supabase,
  alerts: AlertCondition[],
): Promise<void> {
  // The service client, not the request's. Writing alert history is an
  // administrative action, and `metrics.alerts` has RLS on with no policies, so
  // a user-scoped client is denied -- which would put this back where it was,
  // logging an error and keeping nothing. The parameter stays because the
  // signature is shared with the other alert helpers, and a request-scoped
  // client reaching for an admin table is the mistake this makes explicit.
  const supabase = getSupabaseClient();
  try {
    const records = alerts.map((alert) => ({
      alert_type: alert.type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      details: alert.details || {},
      created_at: new Date().toISOString(),
    }));

    // `.schema("metrics").from("alerts")`, not `.from("metrics.alerts")`.
    //
    // The client is created with `db: { schema: "public" }`, so a qualified
    // name passed to `from()` is resolved *inside* public: the request would
    // have gone to `/rest/v1/metrics.alerts`, which is not a route, and it
    // would have failed the same way whether or not the table existed. So the
    // missing table was one of two independent reasons this insert could never
    // have worked, and the second one is a mistake the generated type names
    // exactly.
    const { error } = await supabase.schema("metrics").from("alerts").insert(records);
    if (error) {
      logger.error("Failed to log alerts", { error: error.message });
    }
  } catch (error) {
    logger.error("Error logging alerts", { error });
  }
}

export async function filterByAlertCooldowns(
  _supabase: Supabase,
  alerts: AlertCondition[],
): Promise<AlertCondition[]> {
  // Service client, for the same reason as `logAlerts`: `metrics.alerts` is
  // RLS-protected and service-role-only.
  const supabase = getSupabaseClient();
  try {
    const cooldownTime = new Date(
      Date.now() - CONFIG.alertCooldownMinutes * 60 * 1000,
    ).toISOString();

    const alertTypes = [...new Set(alerts.map((a) => a.type))];

    // The query that made this function a no-op until
    // `20261015000000_metrics_alerts.sql`. It had been failing inside the
    // `catch` since the alerts function was written, and because a failed
    // read returns the alerts unchanged the function read as though it
    // deduplicated while deduplicating nothing.
    const { data: recentAlerts, error } = await supabase
      .schema("metrics")
      .from("alerts")
      .select("alert_type")
      .in("alert_type", alertTypes)
      .gte("created_at", cooldownTime);

    if (error) return alerts;

    const recentTypes = new Set((recentAlerts || []).map((a) => a.alert_type));
    return alerts.filter((alert) => !recentTypes.has(alert.type));
  } catch {
    return alerts;
  }
}

export async function getSecretSafe(
  supabase: Supabase,
  secretName: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("get_secret_audited", {
      secret_name: secretName,
      requesting_user_id: "system",
      request_metadata: {
        source: "api-v1-alerts",
        timestamp: new Date().toISOString(),
      },
    });

    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}
