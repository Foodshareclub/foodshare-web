/**
 * Email Health & Provider Monitoring
 * Bounce stats, provider health, circuit breakers, templates
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "../cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

export interface BounceStats {
  totalBounces: number;
  hardBounces: number;
  softBounces: number;
  complaints: number;
  unsubscribes: number;
  bounceRate: number;
  last7Days: Array<{ date: string; bounces: number; complaints: number }>;
}

export interface ProviderHealth {
  provider: "resend" | "brevo" | "aws_ses" | "mailersend";
  healthScore: number;
  successRate: number;
  avgLatencyMs: number;
  totalRequests: number;
  status: "healthy" | "degraded" | "down";
  lastSynced?: string | null;
  dailyQuotaUsed?: number;
  dailyQuotaLimit?: number;
  monthlyQuotaUsed?: number;
  monthlyQuotaLimit?: number;
}

export interface CircuitBreakerState {
  provider: "resend" | "brevo" | "aws_ses" | "mailersend";
  state: "closed" | "open" | "half_open";
  failureCount: number;
  successCount: number;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  halfOpenAt: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  subject: string;
  category: "automation" | "transactional" | "marketing" | "system" | "digest";
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Bounce Statistics
// ============================================================================

export async function getBounceStats(): Promise<BounceStats> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.EMAIL_STATS);

  const supabase = createCachedClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [bounceEventsRes, suppressionRes, dailyBouncesRes, emailsSentRes] = await Promise.all([
    // Bounce events by type (last 30 days)
    supabase
      .from("email_bounce_events")
      .select("event_type, bounce_type")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Suppression list by reason
    supabase.from("email_suppression_list").select("reason"),
    // Daily bounces (last 7 days)
    supabase
      .from("email_bounce_events")
      .select("created_at, event_type")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    // Total emails sent (for bounce rate calculation)
    supabase
      .from("email_provider_quota")
      .select("emails_sent")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0]),
  ]);

  const bounceEvents = bounceEventsRes.data || [];
  const suppressionData = suppressionRes.data || [];
  const dailyBounces = dailyBouncesRes.data || [];
  const emailsSent = (emailsSentRes.data || []).reduce((sum, q) => sum + (q.emails_sent || 0), 0);

  // Count by type
  let hardBounces = 0,
    softBounces = 0,
    complaints = 0,
    unsubscribes = 0;

  for (const event of bounceEvents) {
    if (event.event_type === "bounce") {
      if (event.bounce_type === "hard") hardBounces++;
      else softBounces++;
    } else if (event.event_type === "complaint") {
      complaints++;
    } else if (event.event_type === "unsubscribe") {
      unsubscribes++;
    }
  }

  // Also count from suppression list
  for (const s of suppressionData) {
    if (s.reason === "complaint") complaints++;
    else if (s.reason === "unsubscribe") unsubscribes++;
  }

  // Group daily bounces
  const dailyMap = new Map<string, { bounces: number; complaints: number }>();
  for (const event of dailyBounces) {
    const date = event.created_at.split("T")[0];
    const existing = dailyMap.get(date) || { bounces: 0, complaints: 0 };
    if (event.event_type === "bounce") existing.bounces++;
    else if (event.event_type === "complaint") existing.complaints++;
    dailyMap.set(date, existing);
  }

  const last7Days = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalBounces = hardBounces + softBounces;

  return {
    totalBounces,
    hardBounces,
    softBounces,
    complaints,
    unsubscribes,
    bounceRate: emailsSent > 0 ? Math.round((totalBounces / emailsSent) * 1000) / 10 : 0,
    last7Days,
  };
}

// ============================================================================
// Provider Health
// ============================================================================

/**
 * Get provider health metrics from database
 * Uses admin client to bypass RLS (admin-only data)
 * Called from API routes that already check admin permissions
 */
export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_provider_health_metrics")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error) {
    console.error("[getProviderHealth] Database error:", error);
  }

  if (!data || data.length === 0) {
    // Return defaults if no metrics
    return [
      {
        provider: "resend",
        healthScore: 100,
        successRate: 100,
        avgLatencyMs: 0,
        totalRequests: 0,
        status: "healthy",
      },
      {
        provider: "brevo",
        healthScore: 100,
        successRate: 100,
        avgLatencyMs: 0,
        totalRequests: 0,
        status: "healthy",
      },
      {
        provider: "mailersend",
        healthScore: 100,
        successRate: 100,
        avgLatencyMs: 0,
        totalRequests: 0,
        status: "healthy",
      },
      {
        provider: "aws_ses",
        healthScore: 100,
        successRate: 100,
        avgLatencyMs: 0,
        totalRequests: 0,
        status: "healthy",
      },
    ];
  }

  return data.map((m) => ({
    provider: m.provider as "resend" | "brevo" | "mailersend" | "aws_ses",
    healthScore: m.health_score || 100,
    successRate:
      m.total_requests > 0
        ? Math.round((m.successful_requests / m.total_requests) * 1000) / 10
        : 100,
    avgLatencyMs: Number(m.average_latency_ms) || 0,
    totalRequests: m.total_requests || 0,
    status: m.health_score >= 80 ? "healthy" : m.health_score >= 50 ? "degraded" : "down",
    lastSynced: m.last_synced_at || null,
    dailyQuotaUsed: m.daily_quota_used || 0,
    dailyQuotaLimit: m.daily_quota_limit || 500,
    monthlyQuotaUsed: m.monthly_quota_used || 0,
    monthlyQuotaLimit: m.monthly_quota_limit || 15000,
  }));
}

// ============================================================================
// Circuit Breaker State
// ============================================================================

/**
 * Get circuit breaker state for all providers
 * Uses admin client to bypass RLS
 */
export async function getCircuitBreakerStates(): Promise<CircuitBreakerState[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_circuit_breaker_state")
    .select("*")
    .order("provider");

  if (error) {
    console.error("[getCircuitBreakerStates] Error:", error);
    return [];
  }

  return (data || []).map((cb) => ({
    provider: cb.provider as CircuitBreakerState["provider"],
    state: cb.state || "closed",
    failureCount: cb.failure_count || 0,
    successCount: cb.success_count || 0,
    lastFailureAt: cb.last_failure_at,
    lastSuccessAt: cb.last_success_at,
    openedAt: cb.opened_at,
    halfOpenAt: cb.half_open_at,
  }));
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Get email templates from database
 * Uses admin client to bypass RLS
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    console.error("[getEmailTemplates] Error:", error);
    return [];
  }

  return (data || []).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    subject: t.subject || "",
    category: t.category || "transactional",
    isActive: t.is_active ?? true,
    version: t.version || 1,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}
