/**
 * Alert Check Functions
 *
 * Individual threshold probes (error rate, latency, circuits, logins,
 * vault, pool). Extracted from `api-v1-alerts/index.ts` — no logic changes.
 */

import { logger } from "../../_shared/logger.ts";
import type { getSupabaseClient } from "../../_shared/supabase.ts";
import type { AlertCondition, AlertSeverity, AlertThresholds, AlertType } from "./types.ts";

type Supabase = ReturnType<typeof getSupabaseClient>;

export async function checkErrorRate(
  supabase: Supabase,
  thresholds: AlertThresholds,
): Promise<AlertCondition | null> {
  try {
    const { data, error } = await supabase.rpc("get_error_rate", {
      p_minutes: 5,
    });
    if (error || !data) return null;

    const metrics = Array.isArray(data) ? data[0] : data;
    if (!metrics) return null;

    const errorRate = parseFloat(String(metrics.error_rate || 0));

    if (errorRate > thresholds.errorRatePercent) {
      return {
        type: "error_rate_high",
        severity: errorRate > thresholds.errorRatePercent * 2 ? "critical" : "warning",
        message: `Error rate ${
          errorRate.toFixed(1)
        }% exceeds threshold ${thresholds.errorRatePercent}%`,
        value: errorRate,
        threshold: thresholds.errorRatePercent,
        details: {
          total_requests: metrics.total_requests,
          error_count: metrics.error_count,
          window_minutes: 5,
        },
      };
    }
    return null;
  } catch (error) {
    logger.error("Error checking error rate", { error });
    return null;
  }
}

export async function checkLatency(
  supabase: Supabase,
  thresholds: AlertThresholds,
): Promise<AlertCondition | null> {
  try {
    const { data, error } = await supabase.rpc("get_p95_latency", {
      p_minutes: 5,
    });
    if (error) return null;

    const p95 = typeof data === "number" ? data : 0;

    if (p95 > thresholds.p95LatencyMs) {
      return {
        type: "latency_high",
        severity: p95 > thresholds.p95LatencyMs * 2 ? "critical" : "warning",
        message: `P95 latency ${p95}ms exceeds threshold ${thresholds.p95LatencyMs}ms`,
        value: p95,
        threshold: thresholds.p95LatencyMs,
        details: { window_minutes: 5 },
      };
    }
    return null;
  } catch (error) {
    logger.error("Error checking latency", { error });
    return null;
  }
}

export async function checkCircuitBreakers(
  supabase: Supabase,
): Promise<AlertCondition[]> {
  try {
    // `metrics.circuit_status` never existed. That relation is absent from the
    // catalog, so the query 404'd against PostgREST, `error` was set, and this
    // function returned [] on every run: circuit-breaker alerts were silently
    // dead rather than merely mislabelled. The open circuits live in
    // `email_circuit_breaker_state`, where the name is `provider` and the count
    // is `failures`. The payload keys are left as they were so the
    // AlertCondition contract its consumers already read is unchanged.
    const { data, error } = await supabase
      .from("email_circuit_breaker_state")
      .select("provider, state, failures, updated_at")
      .eq("state", "open");

    if (error || !data) return [];

    return data.map((circuit) => ({
      type: "circuit_breaker_open" as AlertType,
      severity: "critical" as AlertSeverity,
      message: `Circuit breaker '${circuit.provider}' is OPEN`,
      value: circuit.failures,
      threshold: 0,
      details: {
        circuit_name: circuit.provider,
        failure_count: circuit.failures,
        last_change: circuit.updated_at,
      },
    }));
  } catch (error) {
    logger.error("Error checking circuit breakers", { error });
    return [];
  }
}

export async function checkLoginSpike(
  supabase: Supabase,
  thresholds: AlertThresholds,
): Promise<AlertCondition | null> {
  try {
    const { data, error } = await supabase.rpc("get_login_spike_stats", {
      p_current_window_minutes: 30,
      p_baseline_window_hours: 24,
    });

    if (error || !data) return null;

    const stats = Array.isArray(data) ? data[0] : data;
    if (!stats) return null;

    // Same coercion as checkErrorRate above. The RPC's return type does not
    // describe these columns, so the value arrives as an untyped scalar; going
    // through String also means a null or a stringified number from the
    // database cannot make `.toFixed()` below throw.
    const multiplier = parseFloat(String(stats.spike_multiplier ?? 0));

    if (multiplier > thresholds.failedLoginMultiplier) {
      return {
        type: "login_spike",
        severity: "critical",
        message: `Failed login spike: ${multiplier.toFixed(1)}x normal rate`,
        value: multiplier,
        threshold: thresholds.failedLoginMultiplier,
        details: {
          current_failures: stats.current_failures,
          baseline_failures: stats.baseline_failures,
          window_minutes: 30,
        },
      };
    }
    return null;
  } catch (error) {
    logger.error("Error checking login spike", { error });
    return null;
  }
}

export async function checkVaultFailures(
  supabase: Supabase,
  thresholds: AlertThresholds,
): Promise<AlertCondition | null> {
  try {
    const { data, error } = await supabase.rpc("get_vault_failure_count", {
      p_hours: 1,
    });
    if (error) return null;

    const failures = typeof data === "number" ? data : 0;

    if (failures > thresholds.vaultFailuresPerHour) {
      return {
        type: "vault_failures",
        severity: "critical",
        message: `${failures} vault access failures in last hour`,
        value: failures,
        threshold: thresholds.vaultFailuresPerHour,
        details: { window_hours: 1 },
      };
    }
    return null;
  } catch (error) {
    logger.error("Error checking vault failures", { error });
    return null;
  }
}

export async function checkConnectionPool(
  supabase: Supabase,
  thresholds: AlertThresholds,
): Promise<AlertCondition | null> {
  try {
    const { data, error } = await supabase.rpc("get_connection_pool_stats");
    if (error || !data) return null;

    const stats = Array.isArray(data) ? data[0] : data;
    if (!stats) return null;

    const utilization = parseFloat(String(stats.utilization_percent ?? 0));

    if (utilization > thresholds.connectionPoolPercent) {
      return {
        type: "connection_pool_exhaustion",
        severity: utilization > 90 ? "critical" : "warning",
        message: `Connection pool at ${utilization.toFixed(0)}% utilization`,
        value: utilization,
        threshold: thresholds.connectionPoolPercent,
        details: {
          total_connections: stats.total_connections,
          active_connections: stats.active_connections,
        },
      };
    }
    return null;
  } catch (error) {
    logger.error("Error checking connection pool", { error });
    return null;
  }
}
