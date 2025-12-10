/**
 * Monitor Email Health v2 - Optimized
 *
 * Improvements:
 * - Uses Deno.serve (modern API)
 * - Single aggregated health query
 * - Efficient cleanup with partitioned deletes
 * - Structured logging
 * - Alert deduplication
 */

import { getSupabaseClient } from "../_shared/supabase.ts";

// Types
interface HealthMetric {
  provider: string;
  healthScore: number;
  successRate: number;
  avgLatencyMs: number;
  totalRequests: number;
  consecutiveFailures: number;
  circuitState: string;
}

interface MonitorResult {
  snapshotsTaken: number;
  alertsGenerated: string[];
  cleanupPerformed: boolean;
  healthSummary: HealthMetric[];
  durationMs: number;
}

// Config
const HEALTH_CRITICAL = 30;
const HEALTH_WARNING = 50;
const LATENCY_WARNING_MS = 2000;
const SUCCESS_RATE_WARNING = 0.7;
const RETENTION_DAYS = 90;

// Alert deduplication (in-memory, resets on cold start)
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 3600_000; // 1 hour

function shouldAlert(alertKey: string): boolean {
  const lastAlert = recentAlerts.get(alertKey);
  if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) {
    return false;
  }
  recentAlerts.set(alertKey, Date.now());
  return true;
}

async function getHealthMetrics(
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<HealthMetric[]> {
  const { data, error } = await supabase
    .from("email_provider_health_metrics")
    .select("*")
    .order("provider");

  if (error) throw error;

  return (data || []).map((m: Record<string, unknown>) => ({
    provider: m.provider,
    healthScore: m.health_score ?? 100,
    successRate: m.total_requests > 0 ? m.successful_requests / m.total_requests : 1,
    avgLatencyMs: m.average_latency_ms ?? 0,
    totalRequests: m.total_requests ?? 0,
    consecutiveFailures: m.consecutive_failures ?? 0,
    circuitState: m.circuit_state ?? "closed",
  }));
}

function generateAlerts(metrics: HealthMetric[]): string[] {
  const alerts: string[] = [];

  for (const m of metrics) {
    // Critical health
    if (m.healthScore <= HEALTH_CRITICAL) {
      const key = `critical_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`CRITICAL: ${m.provider} health=${m.healthScore}/100`);
      }
    }
    // Warning health
    else if (m.healthScore <= HEALTH_WARNING) {
      const key = `warning_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} health=${m.healthScore}/100`);
      }
    }

    // Low success rate
    if (m.totalRequests > 10 && m.successRate < SUCCESS_RATE_WARNING) {
      const key = `success_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} success_rate=${(m.successRate * 100).toFixed(1)}%`);
      }
    }

    // High latency
    if (m.avgLatencyMs > LATENCY_WARNING_MS) {
      const key = `latency_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} latency=${m.avgLatencyMs}ms`);
      }
    }

    // Circuit breaker open
    if (m.circuitState === "open") {
      const key = `circuit_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`ALERT: ${m.provider} circuit breaker OPEN`);
      }
    }
  }

  return alerts;
}

async function takeSnapshot(supabase: ReturnType<typeof getSupabaseClient>): Promise<number> {
  try {
    const { error } = await supabase.rpc("snapshot_provider_health");
    if (error) throw error;
    return 3; // 3 providers
  } catch (error) {
    console.error("[monitor] Snapshot failed:", error);
    return 0;
  }
}

async function cleanupOldData(supabase: ReturnType<typeof getSupabaseClient>): Promise<boolean> {
  const now = new Date();

  // Only run cleanup at 2-3 AM
  if (now.getUTCHours() !== 2) {
    return false;
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // Delete old history in batches
    const { error } = await supabase
      .from("email_provider_health_history")
      .delete()
      .lt("created_at", cutoff.toISOString())
      .limit(1000);

    if (error) throw error;

    console.log(`[monitor] Cleaned data older than ${RETENTION_DAYS} days`);
    return true;
  } catch (error) {
    console.error("[monitor] Cleanup failed:", error);
    return false;
  }
}

async function resetDailyMetrics(supabase: ReturnType<typeof getSupabaseClient>): Promise<boolean> {
  const now = new Date();

  // Only reset at midnight (0:00-0:15 UTC)
  if (now.getUTCHours() !== 0 || now.getUTCMinutes() > 15) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("email_provider_health_metrics")
      .update({
        measurement_window_start: now.toISOString(),
        last_updated: now.toISOString(),
      })
      .neq("provider", "none");

    if (error) throw error;

    console.log("[monitor] Daily metrics reset");
    return true;
  } catch (error) {
    console.error("[monitor] Reset failed:", error);
    return false;
  }
}

// Main handler
Deno.serve(async (_req) => {
  const startTime = performance.now();

  try {
    const supabase = getSupabaseClient();

    // Get current health
    const metrics = await getHealthMetrics(supabase);

    // Generate alerts
    const alerts = generateAlerts(metrics);

    // Take snapshot
    const snapshots = await takeSnapshot(supabase);

    // Cleanup old data (conditional)
    const cleaned = await cleanupOldData(supabase);

    // Reset daily metrics (conditional)
    await resetDailyMetrics(supabase);

    // Log alerts
    if (alerts.length > 0) {
      console.warn("[monitor] Alerts:", alerts);
    }

    const result: MonitorResult = {
      snapshotsTaken: snapshots,
      alertsGenerated: alerts,
      cleanupPerformed: cleaned,
      healthSummary: metrics,
      durationMs: Math.round(performance.now() - startTime),
    };

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[monitor] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Math.round(performance.now() - startTime),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
