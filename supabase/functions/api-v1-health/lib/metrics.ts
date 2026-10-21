/**
 * Health Metrics Handler (GET /metrics)
 *
 * Prometheus exposition or JSON observability snapshot with DB probe and
 * healthy/degraded/unhealthy rollup.
 * Extracted from `api-v1-health/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { getAllCircuitStatuses } from "../../_shared/circuit-breaker.ts";
import { getErrorStats, getRecentAlerts } from "../../_shared/error-tracking.ts";
import { logger } from "../../_shared/logger.ts";
import { getHealthMetrics } from "../../_shared/performance.ts";
import { formatPrometheusMetrics } from "../../_shared/prometheus.ts";
import { getSupabaseClient } from "../../_shared/supabase.ts";

export async function handleMetrics(ctx: HandlerContext): Promise<Response> {
  // Check for Prometheus format
  const url = new URL(ctx.request.url);
  if (url.searchParams.get("format") === "prometheus") {
    const metricsText = formatPrometheusMetrics();
    return new Response(metricsText, {
      status: 200,
      headers: {
        ...ctx.corsHeaders,
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  }

  const startTime = Date.now();

  const healthMetrics = getHealthMetrics();
  const errorStats = getErrorStats();
  const recentAlerts = getRecentAlerts(5);
  const circuitBreakers = getAllCircuitStatuses();

  // Check database connectivity
  let databaseHealthy = false;
  let databaseLatencyMs = 0;
  try {
    const dbStart = Date.now();
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    databaseLatencyMs = Date.now() - dbStart;
    if (error) logger.error("DB_ERROR:", { error: JSON.stringify(error) });
    databaseHealthy = !error;
  } catch (e) {
    logger.error("DB_EXCEPTION:", { error: e });
    databaseHealthy = false;
  }

  const criticalErrors = errorStats.bySeverity.critical;
  const openCircuits = Object.values(circuitBreakers).filter((c) => c.state === "open").length;

  let status: "healthy" | "degraded" | "unhealthy";
  if (!databaseHealthy || criticalErrors > 10 || openCircuits > 3) {
    status = "unhealthy";
  } else if (
    criticalErrors > 0 || openCircuits > 0 ||
    healthMetrics.memory.heapUsed > 512
  ) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  const responseTime = Date.now() - startTime;
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return ok(
    {
      status,
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      system: {
        uptime: healthMetrics.uptime,
        memory: healthMetrics.memory,
      },
      database: {
        healthy: databaseHealthy,
        latencyMs: databaseLatencyMs,
      },
      performance: {
        recentMetrics: healthMetrics.recentMetrics,
        slowQueries: healthMetrics.slowQueries,
      },
      errors: {
        total: errorStats.total,
        bySeverity: errorStats.bySeverity,
        topErrors: errorStats.topErrors.slice(0, 5),
        recentAlerts: recentAlerts.length,
      },
      circuitBreakers: Object.entries(circuitBreakers).map(([name, cb]) => ({
        name,
        state: cb.state,
        failures: cb.failures,
        totalRequests: cb.totalRequests,
        totalFailures: cb.totalFailures,
      })),
    },
    ctx,
    { status: httpStatus },
  );
}
