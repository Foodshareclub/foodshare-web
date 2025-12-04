/**
 * Supabase Edge Function: Monitor Email Provider Health
 *
 * Automated health monitoring and snapshot recording for email providers.
 * Should be triggered via cron job every 5-15 minutes.
 *
 * Cron schedule suggestion: every 10 minutes
 *
 * Features:
 * - Takes periodic health snapshots for trend analysis
 * - Resets daily metrics at midnight
 * - Cleans up old health history (keeps 90 days)
 * - Monitors circuit breaker states
 * - Alerts on critical health issues
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
interface HealthSnapshot {
  provider: string;
  health_score: number;
  success_rate: number;
  average_latency_ms: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
}

interface MonitoringResult {
  snapshot_taken: boolean;
  snapshots_recorded: number;
  metrics_reset: boolean;
  old_data_cleaned: boolean;
  alerts: string[];
  health_summary: HealthSnapshot[];
}

// Constants
const HEALTH_SCORE_CRITICAL_THRESHOLD = 30;
const HEALTH_SCORE_WARNING_THRESHOLD = 50;
const HISTORY_RETENTION_DAYS = 90;

/**
 * Take health snapshot for all providers
 */
async function takeHealthSnapshot(supabase: any): Promise<number> {
  try {
    const { error } = await supabase.rpc("snapshot_provider_health");

    if (error) {
      console.error("Failed to take health snapshot:", error);
      return 0;
    }

    // Count snapshots taken (3 providers)
    return 3;
  } catch (error) {
    console.error("Error taking health snapshot:", error);
    return 0;
  }
}

/**
 * Get current health metrics for all providers
 */
async function getHealthMetrics(supabase: any): Promise<HealthSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from("email_provider_health_metrics")
      .select("*")
      .order("provider");

    if (error) throw error;

    return (
      data?.map((m: any) => ({
        provider: m.provider,
        health_score: m.health_score,
        success_rate: m.total_requests > 0 ? (m.successful_requests / m.total_requests) * 100 : 100,
        average_latency_ms: m.average_latency_ms,
        total_requests: m.total_requests,
        successful_requests: m.successful_requests,
        failed_requests: m.failed_requests,
      })) || []
    );
  } catch (error) {
    console.error("Failed to get health metrics:", error);
    return [];
  }
}

/**
 * Generate health alerts based on current metrics
 */
function generateHealthAlerts(metrics: HealthSnapshot[]): string[] {
  const alerts: string[] = [];

  for (const metric of metrics) {
    // Critical health score
    if (metric.health_score <= HEALTH_SCORE_CRITICAL_THRESHOLD) {
      alerts.push(
        `CRITICAL: ${metric.provider} health score is ${metric.health_score}/100 (threshold: ${HEALTH_SCORE_CRITICAL_THRESHOLD})`
      );
    }
    // Warning health score
    else if (metric.health_score <= HEALTH_SCORE_WARNING_THRESHOLD) {
      alerts.push(
        `WARNING: ${metric.provider} health score is ${metric.health_score}/100 (threshold: ${HEALTH_SCORE_WARNING_THRESHOLD})`
      );
    }

    // High failure rate
    if (metric.total_requests > 10 && metric.success_rate < 70) {
      alerts.push(
        `WARNING: ${metric.provider} has low success rate: ${metric.success_rate.toFixed(1)}%`
      );
    }

    // High latency
    if (metric.average_latency_ms > 2000) {
      alerts.push(
        `WARNING: ${metric.provider} has high average latency: ${metric.average_latency_ms.toFixed(0)}ms`
      );
    }
  }

  return alerts;
}

/**
 * Reset daily metrics if it's a new day
 */
async function resetDailyMetricsIfNeeded(supabase: any): Promise<boolean> {
  try {
    const now = new Date();
    const isStartOfDay = now.getHours() === 0 && now.getMinutes() < 15;

    if (!isStartOfDay) {
      return false;
    }

    // Reset measurement windows
    const { error } = await supabase
      .from("email_provider_health_metrics")
      .update({
        measurement_window_start: now.toISOString(),
        last_updated: now.toISOString(),
      })
      .neq("provider", "none"); // Update all

    if (error) {
      console.error("Failed to reset daily metrics:", error);
      return false;
    }

    console.log("Daily metrics reset completed");
    return true;
  } catch (error) {
    console.error("Error resetting daily metrics:", error);
    return false;
  }
}

/**
 * Clean up old health history data
 */
async function cleanOldHealthHistory(supabase: any): Promise<boolean> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - HISTORY_RETENTION_DAYS);

    const { error } = await supabase
      .from("email_provider_health_history")
      .delete()
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      console.error("Failed to clean old health history:", error);
      return false;
    }

    console.log(`Cleaned health history older than ${HISTORY_RETENTION_DAYS} days`);
    return true;
  } catch (error) {
    console.error("Error cleaning old health history:", error);
    return false;
  }
}

/**
 * Check and report on circuit breaker states
 */
async function checkCircuitBreakerStates(supabase: any): Promise<string[]> {
  const alerts: string[] = [];

  try {
    const { data, error } = await supabase
      .from("email_provider_health_metrics")
      .select("provider, consecutive_failures, last_error, last_error_at")
      .gt("consecutive_failures", 3);

    if (error) throw error;

    if (data && data.length > 0) {
      for (const provider of data) {
        alerts.push(
          `ALERT: ${provider.provider} has ${provider.consecutive_failures} consecutive failures. ` +
            `Last error: ${provider.last_error}`
        );
      }
    }
  } catch (error) {
    console.error("Error checking circuit breaker states:", error);
  }

  return alerts;
}

/**
 * Main monitoring handler
 */
serve(async (req) => {
  // Verify authorization - accept CRON_SECRET or service role key
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Check if authorization is valid
  const validCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const validServiceAuth = serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

  if (cronSecret && !validCronAuth && !validServiceAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  try {
    // Initialize Supabase client with validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(
        "Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error: Missing required environment variables",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current health metrics
    const healthMetrics = await getHealthMetrics(supabase);

    // Take health snapshot
    const snapshotsRecorded = await takeHealthSnapshot(supabase);

    // Reset daily metrics if needed
    const metricsReset = await resetDailyMetricsIfNeeded(supabase);

    // Clean old health history (runs periodically)
    const now = new Date();
    const shouldCleanHistory = now.getHours() === 2 && now.getMinutes() < 15; // 2 AM
    const oldDataCleaned = shouldCleanHistory ? await cleanOldHealthHistory(supabase) : false;

    // Generate health alerts
    const healthAlerts = generateHealthAlerts(healthMetrics);

    // Check circuit breaker states
    const circuitAlerts = await checkCircuitBreakerStates(supabase);

    const allAlerts = [...healthAlerts, ...circuitAlerts];

    // Log alerts
    if (allAlerts.length > 0) {
      console.error("HEALTH ALERTS:", allAlerts);
    }

    const duration = Date.now() - startTime;
    const result: MonitoringResult = {
      snapshot_taken: snapshotsRecorded > 0,
      snapshots_recorded: snapshotsRecorded,
      metrics_reset: metricsReset,
      old_data_cleaned: oldDataCleaned,
      alerts: allAlerts,
      health_summary: healthMetrics,
    };

    console.log(`[HealthMonitor] Completed in ${duration}ms`);
    console.log(`[HealthMonitor] Snapshots: ${snapshotsRecorded}, Alerts: ${allAlerts.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Health monitoring completed",
        duration_ms: duration,
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("Health monitoring error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Health monitoring failed",
        details: error instanceof Error ? error.message : String(error),
        duration_ms: duration,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
