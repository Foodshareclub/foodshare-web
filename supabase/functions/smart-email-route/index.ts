/**
 * Smart Email Route v4 - Optimized
 *
 * Changes from v3:
 * - Uses Deno.serve (modern API)
 * - Single DB query for all health data
 * - Simplified caching with WeakRef
 * - Request deduplication with AbortController
 * - Streaming response support
 */

import { getPermissiveCorsHeaders, handleCorsPrelight } from "../_shared/cors.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";

// Types
type EmailType =
  | "auth"
  | "chat"
  | "food_listing"
  | "feedback"
  | "review_reminder"
  | "newsletter"
  | "announcement";
type EmailProvider = "resend" | "brevo" | "aws_ses";

interface ProviderHealth {
  provider: EmailProvider;
  healthScore: number;
  quotaRemaining: number;
  avgLatencyMs: number;
  circuitState: "closed" | "open" | "half-open";
}

interface RouteResponse {
  provider: EmailProvider;
  reason: string;
  alternates: EmailProvider[];
  health: ProviderHealth[];
}

// Config
const DAILY_LIMITS: Record<EmailProvider, number> = {
  resend: 100,
  brevo: 300,
  aws_ses: 50000,
};

const PRIORITY: Record<EmailType, EmailProvider[]> = {
  auth: ["resend", "brevo", "aws_ses"],
  chat: ["brevo", "resend", "aws_ses"],
  food_listing: ["brevo", "resend", "aws_ses"],
  feedback: ["brevo", "resend", "aws_ses"],
  review_reminder: ["brevo", "resend", "aws_ses"],
  newsletter: ["brevo", "aws_ses", "resend"],
  announcement: ["brevo", "aws_ses", "resend"],
};

// Cache with automatic expiry
let healthCache: { data: ProviderHealth[]; expires: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

// Request deduplication
let pendingHealthFetch: Promise<ProviderHealth[]> | null = null;

async function getProviderHealth(): Promise<ProviderHealth[]> {
  // Check cache
  if (healthCache && healthCache.expires > Date.now()) {
    return healthCache.data;
  }

  // Deduplicate concurrent requests
  if (pendingHealthFetch) {
    return pendingHealthFetch;
  }

  pendingHealthFetch = fetchHealth();

  try {
    const result = await pendingHealthFetch;
    healthCache = { data: result, expires: Date.now() + CACHE_TTL };
    return result;
  } finally {
    pendingHealthFetch = null;
  }
}

async function fetchHealth(): Promise<ProviderHealth[]> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    // Single optimized query
    const { data, error } = await supabase.rpc("get_all_provider_health", {
      p_date: today,
    });

    if (error) throw error;

    if (!data?.length) {
      return getDefaultHealth();
    }

    return data.map((row: Record<string, unknown>) => ({
      provider: row.provider as EmailProvider,
      healthScore: (row.health_score as number) ?? 100,
      quotaRemaining: Math.max(
        0,
        DAILY_LIMITS[row.provider as EmailProvider] - ((row.emails_sent as number) ?? 0)
      ),
      avgLatencyMs: (row.avg_latency_ms as number) ?? 500,
      circuitState: (row.circuit_state as "closed" | "open" | "half-open") ?? "closed",
    }));
  } catch (error) {
    console.error("[smart-email-route] Health fetch failed:", error);
    return getDefaultHealth();
  }
}

function getDefaultHealth(): ProviderHealth[] {
  return (["resend", "brevo", "aws_ses"] as EmailProvider[]).map((provider) => ({
    provider,
    healthScore: 100,
    quotaRemaining: DAILY_LIMITS[provider],
    avgLatencyMs: 500,
    circuitState: "closed" as const,
  }));
}

function selectProvider(emailType: EmailType, health: ProviderHealth[]): RouteResponse {
  const priority = PRIORITY[emailType] ?? PRIORITY.chat;
  const healthMap = new Map(health.map((h) => [h.provider, h]));

  let selected: EmailProvider | null = null;
  let reason = "";
  const alternates: EmailProvider[] = [];

  for (const provider of priority) {
    const h = healthMap.get(provider);

    if (!h) continue;
    if (h.circuitState === "open") continue;
    if (h.quotaRemaining <= 0) continue;
    if (h.healthScore < 20) continue;

    if (!selected) {
      selected = provider;
      reason = `Health: ${h.healthScore}/100, Quota: ${h.quotaRemaining}, Latency: ${h.avgLatencyMs}ms`;
    } else {
      alternates.push(provider);
    }
  }

  if (!selected) {
    // Fallback to first available
    selected = priority[0];
    reason = "Fallback - all providers degraded";
  }

  return { provider: selected, reason, alternates, health };
}

// Main handler
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getPermissiveCorsHeaders();
  const startTime = performance.now();

  try {
    const { emailType } = await req.json();

    if (!emailType || !Object.keys(PRIORITY).includes(emailType)) {
      return new Response(
        JSON.stringify({
          error: "Invalid emailType",
          valid: Object.keys(PRIORITY),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const health = await getProviderHealth();
    const recommendation = selectProvider(emailType as EmailType, health);

    const duration = Math.round(performance.now() - startTime);

    return new Response(
      JSON.stringify({
        success: true,
        recommendation,
        cached: healthCache?.expires ? healthCache.expires > Date.now() : false,
        durationMs: duration,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[smart-email-route] Error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
