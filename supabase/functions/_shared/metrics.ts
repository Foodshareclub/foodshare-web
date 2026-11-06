/**
 * Metrics Collection Client
 *
 * Provides fire-and-forget metrics recording for Edge Functions.
 * Records to the metrics schema for observability dashboards.
 *
 * Features:
 * - Async, non-blocking metric recording
 * - Health check result recording
 */

import { getSupabaseClient } from "./supabase.ts";
import { logger } from "./logger.ts";

/**
 * Get metrics summary from database
 */
export async function getMetricsSummary(minutes: number = 5): Promise<
  {
    errorRate: number;
    p95Latency: number;
    totalRequests: number;
  } | null
> {
  try {
    const supabase = getSupabaseClient();

    const [errorRateResult, p95Result] = await Promise.all([
      supabase.rpc("get_error_rate", { p_minutes: minutes }),
      supabase.rpc("get_p95_latency", { p_minutes: minutes }),
    ]);

    if (errorRateResult.error || p95Result.error) {
      logger.error("Failed to get metrics summary:", {
        error: errorRateResult.error || p95Result.error,
      });
      return null;
    }

    const errorData = errorRateResult.data?.[0] ||
      { total_requests: 0, error_rate: 0 };

    return {
      errorRate: parseFloat(errorData.error_rate) || 0,
      p95Latency: p95Result.data || 0,
      totalRequests: parseInt(errorData.total_requests) || 0,
    };
  } catch (error) {
    logger.error("Failed to get metrics summary:", { error });
    return null;
  }
}

/**
 * Record health check result
 */
export async function recordHealthCheck(
  service: string,
  status: "healthy" | "degraded" | "unhealthy",
  responseTimeMs: number,
  details?: Record<string, unknown>,
  errorMessage?: string,
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    await supabase.from("metrics.health_checks").insert({
      service,
      status,
      response_time_ms: responseTimeMs,
      details: details || {},
      error_message: errorMessage,
    });
  } catch (error) {
    logger.error("Failed to record health check:", { error });
  }
}
