/**
 * Monitor Email Health v3 - Robust Live API Pings
 *
 * Pings provider APIs to verify connectivity and get real data:
 * - Resend: GET /domains + GET /emails (recent activity)
 * - Brevo: GET /account (plan, credits, usage)
 * - AWS SES: GetSendQuota + GetSendStatistics
 *
 * Query params:
 * - ?action=ping - Quick API connectivity check (fast)
 * - ?action=full - Full monitoring with DB snapshots
 * - ?action=detailed - Include recent email activity
 */

import { getSupabaseClient } from "../_shared/supabase.ts";
import { createAWSSESProvider } from "../_shared/aws-ses.ts";

// ============================================================================
// Types
// ============================================================================

interface ProviderPingResult {
  provider: string;
  status: "ok" | "error" | "unconfigured";
  latencyMs: number;
  message: string;
  configured: boolean;
  apiResponse?: Record<string, unknown>;
  quota?: Partial<QuotaInfo>;
}

interface ResendApiResponse {
  domains: number;
  domainNames: string[];
  recentEmails?: number;
}

interface BrevoApiResponse {
  email: string;
  companyName: string;
  plan: string;
  credits: number;
  creditsType: string;
  relay?: { enabled: boolean; data?: { userName: string } };
}

interface AwsSesApiResponse {
  region: string;
  max24HourSend: number;
  maxSendRate: number;
  sentLast24Hours: number;
  remainingQuota: number;
}

interface QuotaInfo {
  provider: string;
  daily: { sent: number; limit: number; remaining: number; percentUsed: number };
  monthly: { sent: number; limit: number; remaining: number; percentUsed: number };
}

interface HealthMetric {
  provider: string;
  healthScore: number;
  successRate: number;
  avgLatencyMs: number;
  totalRequests: number;
  consecutiveFailures: number;
  circuitState: string;
}

interface MonitorResponse {
  success: boolean;
  timestamp: string;
  providers: ProviderPingResult[];
  quotas: QuotaInfo[];
  summary: {
    totalProviders: number;
    healthyProviders: number;
    configuredProviders: number;
    totalDailyRemaining: number;
    totalMonthlyRemaining: number;
    totalDailyLimit: number;
    totalMonthlyLimit: number;
  };
  healthSummary?: HealthMetric[];
  alertsGenerated?: string[];
  snapshotsTaken?: number;
  cleanupPerformed?: boolean;
  durationMs: number;
}

// Provider limits (conservative defaults)
const PROVIDER_LIMITS: Record<string, { daily: number; monthly: number }> = {
  resend: { daily: 100, monthly: 3000 },
  brevo: { daily: 300, monthly: 9000 },
  aws_ses: { daily: 100, monthly: 62000 },
};

// Config
const HEALTH_CRITICAL = 30;
const HEALTH_WARNING = 50;
const LATENCY_WARNING_MS = 2000;
const SUCCESS_RATE_WARNING = 0.7;
const RETENTION_DAYS = 90;
const REQUEST_TIMEOUT_MS = 10000;

// Alert deduplication
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 3600_000;

function shouldAlert(alertKey: string): boolean {
  const lastAlert = recentAlerts.get(alertKey);
  if (lastAlert && Date.now() - lastAlert < ALERT_COOLDOWN_MS) return false;
  recentAlerts.set(alertKey, Date.now());
  return true;
}

// ============================================================================
// Utility: Fetch with timeout
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Resend API - Full verification
// ============================================================================

async function pingResend(detailed: boolean = false): Promise<ProviderPingResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return {
      provider: "resend",
      status: "unconfigured",
      latencyMs: 0,
      message: "RESEND_API_KEY environment variable not set",
      configured: false,
    };
  }

  const start = performance.now();
  try {
    // 1. Get domains to verify API key
    const domainsRes = await fetchWithTimeout("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!domainsRes.ok) {
      const errorText = await domainsRes.text();
      return {
        provider: "resend",
        status: "error",
        latencyMs: Math.round(performance.now() - start),
        message: `API error: HTTP ${domainsRes.status} - ${errorText.slice(0, 200)}`,
        configured: true,
      };
    }

    const domainsData = await domainsRes.json();
    const domains = domainsData.data || [];
    const domainNames = domains.map((d: { name: string }) => d.name);

    const apiResponse: ResendApiResponse = {
      domains: domains.length,
      domainNames,
    };

    // 2. Optionally get recent emails for activity check
    if (detailed) {
      try {
        const emailsRes = await fetchWithTimeout("https://api.resend.com/emails?limit=10", {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (emailsRes.ok) {
          const emailsData = await emailsRes.json();
          apiResponse.recentEmails = emailsData.data?.length || 0;
        }
      } catch {
        // Non-critical, ignore
      }
    }

    const latencyMs = Math.round(performance.now() - start);
    return {
      provider: "resend",
      status: "ok",
      latencyMs,
      message: `Connected. ${domains.length} domain${domains.length !== 1 ? "s" : ""}: ${domainNames.join(", ") || "none"}`,
      configured: true,
      apiResponse,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timeout (10s)"
          : err.message
        : "Unknown error";
    return {
      provider: "resend",
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      message,
      configured: true,
    };
  }
}

// ============================================================================
// Brevo API - Full account info with credits
// ============================================================================

async function pingBrevo(): Promise<ProviderPingResult> {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  if (!apiKey) {
    return {
      provider: "brevo",
      status: "unconfigured",
      latencyMs: 0,
      message: "BREVO_API_KEY environment variable not set",
      configured: false,
    };
  }

  const start = performance.now();
  try {
    const res = await fetchWithTimeout("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      return {
        provider: "brevo",
        status: "error",
        latencyMs: Math.round(performance.now() - start),
        message: `API error: HTTP ${res.status} - ${errorText.slice(0, 200)}`,
        configured: true,
      };
    }

    const data = await res.json();
    const latencyMs = Math.round(performance.now() - start);

    // Extract plan info
    const plan = data.plan?.[0] || {};
    const planType = plan.type || "unknown";
    const credits = plan.credits ?? 0;
    const creditsType = plan.creditsType || "unknown";

    const apiResponse: BrevoApiResponse = {
      email: data.email || "",
      companyName: data.companyName || "",
      plan: planType,
      credits,
      creditsType,
      relay: data.relay,
    };

    // Build informative message
    let message = `Connected. Plan: ${planType}`;
    if (credits !== undefined) {
      message += `, Credits: ${credits.toLocaleString()}`;
      if (creditsType) message += ` (${creditsType})`;
    }

    return {
      provider: "brevo",
      status: "ok",
      latencyMs,
      message,
      configured: true,
      apiResponse,
      quota: {
        provider: "brevo",
        daily: {
          sent: 0,
          limit: planType === "free" ? 300 : 0,
          remaining: planType === "free" ? 300 : 0,
          percentUsed: 0,
        }, // Brevo daily limit only on free
        monthly: { sent: 0, limit: credits, remaining: credits, percentUsed: 0 }, // Credits = remaining monthly
      },
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timeout (10s)"
          : err.message
        : "Unknown error";
    return {
      provider: "brevo",
      status: "error",
      latencyMs: Math.round(performance.now() - start),
      message,
      configured: true,
    };
  }
}

// ============================================================================
// AWS SES - Using shared module with proven SigV4 implementation
// ============================================================================

async function pingAwsSes(): Promise<ProviderPingResult> {
  const start = performance.now();

  // Use the shared AWS SES provider
  const sesProvider = createAWSSESProvider();

  if (!sesProvider) {
    // Check which env vars are missing
    const hasAccessKey = !!Deno.env.get("AWS_ACCESS_KEY_ID");
    const hasSecretKey = !!Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const hasRegion = !!Deno.env.get("AWS_REGION");

    const missing: string[] = [];
    if (!hasAccessKey) missing.push("AWS_ACCESS_KEY_ID");
    if (!hasSecretKey) missing.push("AWS_SECRET_ACCESS_KEY");
    if (!hasRegion) missing.push("AWS_REGION");

    return {
      provider: "aws_ses",
      status: "unconfigured",
      latencyMs: 0,
      message: `Missing env vars: ${missing.join(", ")}`,
      configured: false,
    };
  }

  const debugInfo = sesProvider.getDebugInfo();

  try {
    // Use the provider's getQuota method which has proper SigV4 signing
    const quota = await sesProvider.getQuota();
    const latencyMs = Math.round(performance.now() - start);

    // Check if there was an API error
    if (quota.error) {
      return {
        provider: "aws_ses",
        status: "error",
        latencyMs,
        message: quota.error,
        configured: true,
        apiResponse: {
          region: debugInfo.region,
          accessKeyIdPrefix: debugInfo.accessKeyIdPrefix,
          endpoint: debugInfo.endpoint,
          rawError: quota.rawResponse,
        } as unknown as AwsSesApiResponse,
      };
    }

    // If quota returns all zeros without an error, it might indicate sandbox mode or no permissions
    if (quota.max24HourSend === 0 && quota.maxSendRate === 0) {
      return {
        provider: "aws_ses",
        status: "error",
        latencyMs,
        message: `AWS SES returned zero quota. Region: ${debugInfo.region}. Key: ${debugInfo.accessKeyIdPrefix}. This may indicate: 1) Invalid credentials, 2) Missing SES permissions, 3) SES not enabled in this region`,
        configured: true,
        apiResponse: {
          region: debugInfo.region,
          accessKeyIdPrefix: debugInfo.accessKeyIdPrefix,
          endpoint: debugInfo.endpoint,
        } as unknown as AwsSesApiResponse,
      };
    }

    const apiResponse: AwsSesApiResponse = {
      region: debugInfo.region,
      max24HourSend: quota.max24HourSend,
      maxSendRate: quota.maxSendRate,
      sentLast24Hours: quota.sentLast24Hours,
      remainingQuota: quota.max24HourSend - quota.sentLast24Hours,
    };

    return {
      provider: "aws_ses",
      status: "ok",
      latencyMs,
      message: `Connected. Region: ${debugInfo.region}. Quota: ${quota.sentLast24Hours.toFixed(0)}/${quota.max24HourSend.toFixed(0)} (24h), Rate: ${quota.maxSendRate}/sec`,
      configured: true,
      apiResponse,
      quota: {
        provider: "aws_ses",
        daily: {
          sent: quota.sentLast24Hours,
          limit: quota.max24HourSend,
          remaining: quota.max24HourSend - quota.sentLast24Hours,
          percentUsed:
            quota.max24HourSend > 0
              ? Math.round((quota.sentLast24Hours / quota.max24HourSend) * 100)
              : 0,
        },
        monthly: { sent: 0, limit: 0, remaining: 0, percentUsed: 0 }, // AWS doesn't have strict monthly limit
      },
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      provider: "aws_ses",
      status: "error",
      latencyMs,
      message: `AWS SES error: ${message}. Region: ${debugInfo.region}, Key: ${debugInfo.accessKeyIdPrefix}`,
      configured: true,
    };
  }
}

// ============================================================================
// Database Queries
// ============================================================================

async function getQuotas(supabase: ReturnType<typeof getSupabaseClient>): Promise<QuotaInfo[]> {
  // Use direct table query instead of missing RPC
  const { data, error } = await supabase.from("email_provider_quota").select("*");

  if (error || !data || data.length === 0) {
    // Return defaults
    return Object.entries(PROVIDER_LIMITS).map(([provider, limits]) => ({
      provider,
      daily: {
        sent: 0,
        limit: limits.daily,
        remaining: limits.daily,
        percentUsed: 0,
      },
      monthly: {
        sent: 0,
        limit: limits.monthly,
        remaining: limits.monthly,
        percentUsed: 0,
      },
    }));
  }

  return data.map((q: Record<string, unknown>) => {
    const provider = q.provider as string;
    const limits = PROVIDER_LIMITS[provider] || { daily: 100, monthly: 3000 };

    const dailySent = (q.emails_sent as number) || 0; // The table tracks emails_sent (daily due to unique constraint/reset)
    const dailyLimit = (q.daily_limit as number) || limits.daily;
    // Note: Table doesn't track monthly sent, only daily. We rely on defaults or live data for monthly.

    return {
      provider,
      daily: {
        sent: dailySent,
        limit: dailyLimit,
        remaining: Math.max(0, dailyLimit - dailySent),
        percentUsed: dailyLimit > 0 ? Math.round((dailySent / dailyLimit) * 100) : 0,
      },
      monthly: {
        sent: 0,
        limit: limits.monthly,
        remaining: limits.monthly,
        percentUsed: 0,
      },
    };
  });
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
    provider: m.provider as string,
    healthScore: (m.health_score as number) ?? 100,
    successRate:
      (m.total_requests as number) > 0
        ? Math.round(((m.successful_requests as number) / (m.total_requests as number)) * 1000) / 10
        : 100,
    avgLatencyMs: Math.round((m.average_latency_ms as number) ?? 0),
    totalRequests: (m.total_requests as number) ?? 0,
    consecutiveFailures: (m.consecutive_failures as number) ?? 0,
    circuitState: (m.circuit_state as string) ?? "closed",
  }));
}

function generateAlerts(metrics: HealthMetric[]): string[] {
  const alerts: string[] = [];

  for (const m of metrics) {
    if (m.healthScore <= HEALTH_CRITICAL) {
      const key = `critical_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`CRITICAL: ${m.provider} health=${m.healthScore}/100`);
      }
    } else if (m.healthScore <= HEALTH_WARNING) {
      const key = `warning_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} health=${m.healthScore}/100`);
      }
    }

    if (m.totalRequests > 10 && m.successRate < SUCCESS_RATE_WARNING * 100) {
      const key = `success_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} success_rate=${m.successRate}%`);
      }
    }

    if (m.avgLatencyMs > LATENCY_WARNING_MS) {
      const key = `latency_${m.provider}`;
      if (shouldAlert(key)) {
        alerts.push(`WARNING: ${m.provider} latency=${m.avgLatencyMs}ms`);
      }
    }

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
    return 3;
  } catch (error) {
    console.error("[monitor] Snapshot failed:", error);
    return 0;
  }
}

async function cleanupOldData(supabase: ReturnType<typeof getSupabaseClient>): Promise<boolean> {
  const now = new Date();
  if (now.getUTCHours() !== 2) return false;

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

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

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  const startTime = performance.now();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "full";
  const detailed = action === "detailed";

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    // Ping all providers in parallel (live API checks)
    const [resendResult, brevoResult, awsResult, quotas] = await Promise.all([
      pingResend(detailed),
      pingBrevo(),
      pingAwsSes(),
      getQuotas(supabase),
    ]);

    const providers = [resendResult, brevoResult, awsResult];

    // Persist discovered limits to DB for AWS SES (since it's a hard daily limit)
    if (awsResult.status === "ok" && awsResult.quota?.daily?.limit) {
      const liveLimit = awsResult.quota.daily.limit;
      // Update DB if different (avoid spamming updates if same)
      const currentDbLimit = quotas.find((q) => q.provider === "aws_ses")?.daily?.limit;

      if (liveLimit > 0 && liveLimit !== currentDbLimit) {
        // Upsert the limit for today (logs sent is cumulative, so we preserve it or let it be handled by increment)
        // We only want to update the limit.
        // Using upsert with ON CONFLICT to update only daily_limit
        const today = new Date().toISOString().split("T")[0];

        await supabase
          .from("email_provider_quota")
          .upsert(
            {
              provider: "aws_ses",
              date: today,
              daily_limit: liveLimit,
              // We need to preserve emails_sent if it exists, or 0 if new.
              // Upsert will replace the whole row if we provide all fields?
              // supabase-js upsert behavior depends.
              // Better to update only if exists, or insert if not.
              // But strict upsert requires all non-default fields.
              // emails_sent has default 0.
              // Let's use a harmless update.
            },
            { onConflict: "provider, date", ignoreDuplicates: false }
          )
          .select();
        // Actually, standard UPDATE is safer to not reset emails_sent.
        await supabase
          .from("email_provider_quota")
          .update({ daily_limit: liveLimit })
          .eq("provider", "aws_ses")
          .eq("date", today);
      }
    }

    // Merge live quota data into DB quotas
    const mergedQuotas = quotas.map((q) => {
      const liveData = providers.find((p) => p.provider === q.provider)?.quota;
      if (liveData) {
        // Prioritize live data if available and non-zero
        return {
          ...q,
          daily: {
            ...q.daily,
            ...((liveData.daily?.limit ?? 0) > 0 ? liveData.daily : {}),
            sent: Math.max(q.daily.sent, liveData.daily?.sent ?? 0), // Take max of DB and Live
          },
          monthly: {
            ...q.monthly,
            ...((liveData.monthly?.limit ?? 0) > 0 ? liveData.monthly : {}),
            remaining: liveData.monthly?.remaining ?? q.monthly.remaining, // Brevo gives remaining directly
          },
        };
      }
      return q;
    });

    // Calculate summary
    const healthyProviders = providers.filter((p) => p.status === "ok").length;
    const configuredProviders = providers.filter((p) => p.configured).length;
    const totalDailyRemaining = mergedQuotas.reduce((sum, q) => sum + q.daily.remaining, 0);
    const totalMonthlyRemaining = mergedQuotas.reduce((sum, q) => sum + q.monthly.remaining, 0);
    const totalDailyLimit = mergedQuotas.reduce((sum, q) => sum + q.daily.limit, 0);
    const totalMonthlyLimit = mergedQuotas.reduce((sum, q) => sum + q.monthly.limit, 0);

    const summary = {
      totalProviders: providers.length,
      healthyProviders,
      configuredProviders,
      totalDailyRemaining,
      totalMonthlyRemaining,
      totalDailyLimit,
      totalMonthlyLimit,
    };

    // Update response usage
    const finalQuotas = mergedQuotas;

    // Quick ping response
    if (action === "ping") {
      const response: MonitorResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        providers,
        quotas: finalQuotas,
        summary,
        durationMs: Math.round(performance.now() - startTime),
      };

      return new Response(JSON.stringify(response, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Full monitoring: include DB metrics, snapshots, alerts
    const healthMetrics = await getHealthMetrics(supabase);
    const alerts = generateAlerts(healthMetrics);
    const snapshots = await takeSnapshot(supabase);
    const cleaned = await cleanupOldData(supabase);

    if (alerts.length > 0) {
      console.warn("[monitor] Alerts:", alerts);
    }

    const response: MonitorResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      providers,
      quotas: finalQuotas,
      summary,
      healthSummary: healthMetrics,
      alertsGenerated: alerts,
      snapshotsTaken: snapshots,
      cleanupPerformed: cleaned,
      durationMs: Math.round(performance.now() - startTime),
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("[monitor] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - startTime),
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
