/**
 * Admin Email CRM Data Layer
 * Server-side data fetching for email marketing dashboard
 *
 * Features:
 * - Daily + Monthly quota tracking
 * - Bounce/complaint analytics
 * - Suppression list management
 * - Provider health monitoring
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailProvider, EmailType } from "@/lib/email/types";

// ============================================================================
// Types
// ============================================================================

export interface EmailDashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  emailsSent30d: number;
  avgOpenRate: number;
  avgClickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  activeCampaigns: number;
  activeAutomations: number;
  // Daily quota (combined)
  dailyQuotaUsed: number;
  dailyQuotaLimit: number;
  // Monthly quota (combined)
  monthlyQuotaUsed: number;
  monthlyQuotaLimit: number;
  // Suppression stats
  suppressedEmails: number;
}

export interface ProviderQuotaDetails {
  provider: EmailProvider;
  daily: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  monthly: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  isAvailable: boolean;
}

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

export interface RecentCampaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  campaignType: string;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ActiveAutomation {
  id: string;
  name: string;
  triggerType: string;
  status: "draft" | "active" | "paused" | "archived";
  totalEnrolled: number;
  totalCompleted: number;
  totalConverted: number;
  conversionRate: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string | null;
  cachedCount: number;
  color: string;
  iconName: string;
  isSystem: boolean;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

/**
 * Get email dashboard stats
 * Uses admin client to bypass RLS and aggregate from provider health metrics
 */
export async function getEmailDashboardStats(): Promise<EmailDashboardStats> {
  const supabase = createAdminClient();

  // Parallel fetch all data
  const [
    // Provider health metrics for quota aggregation
    providerMetricsRes,
    // Subscriber counts
    subscribersRes,
    activeSubsRes,
    registeredUsersRes,
    // Automation count
    automationsRes,
    // Campaign count
    campaignsRes,
    // Suppression list count
    suppressionRes,
  ] = await Promise.all([
    // Get all provider health metrics to aggregate quotas
    supabase.from("email_provider_health_metrics").select("*"),
    // Total newsletter subscribers
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
    // Active newsletter subscribers
    supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Registered users with email preferences
    supabase.from("email_preferences").select("*", { count: "exact", head: true }),
    // Active automations
    supabase
      .from("email_automation_flows")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Active campaigns
    supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .in("status", ["draft", "scheduled", "sending"]),
    // Suppression list count
    supabase.from("email_suppression_list").select("*", { count: "exact", head: true }),
  ]);

  // Aggregate quota from all providers
  const providers = providerMetricsRes.data || [];
  const dailyQuotaUsed = providers.reduce((sum, p) => sum + (p.daily_quota_used || 0), 0);
  const dailyQuotaLimit = providers.reduce((sum, p) => sum + (p.daily_quota_limit || 0), 0);
  const monthlyQuotaUsed = providers.reduce((sum, p) => sum + (p.monthly_quota_used || 0), 0);
  const monthlyQuotaLimit = providers.reduce((sum, p) => sum + (p.monthly_quota_limit || 0), 0);
  const totalRequests = providers.reduce((sum, p) => sum + (p.total_requests || 0), 0);
  const successfulRequests = providers.reduce((sum, p) => sum + (p.successful_requests || 0), 0);

  // Calculate rates
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
  const bounceRate = totalRequests > 0 ? 100 - successRate : 0;

  // Combine subscriber counts
  const totalSubs = (subscribersRes.count || 0) + (registeredUsersRes.count || 0);
  const activeSubs = (activeSubsRes.count || 0) + (registeredUsersRes.count || 0);

  return {
    totalSubscribers: totalSubs,
    activeSubscribers: activeSubs,
    emailsSent30d: dailyQuotaUsed, // Use daily quota as proxy for recent sends
    avgOpenRate: 24.5, // TODO: Calculate from email_events when available
    avgClickRate: 3.2, // TODO: Calculate from email_events when available
    unsubscribeRate: 0.3, // TODO: Calculate from unsubscribe events
    bounceRate: Math.round(bounceRate * 10) / 10,
    activeCampaigns: campaignsRes.count || 0,
    activeAutomations: automationsRes.count || 0,
    dailyQuotaUsed,
    dailyQuotaLimit: dailyQuotaLimit || 500,
    monthlyQuotaUsed,
    monthlyQuotaLimit: monthlyQuotaLimit || 15000,
    suppressedEmails: suppressionRes.count || 0,
  };
}

// ============================================================================
// Comprehensive Quota Status (per provider)
// ============================================================================

/**
 * Get comprehensive quota status for all providers
 * Uses admin client to bypass RLS (admin-only data)
 */
export async function getComprehensiveQuotaStatus(): Promise<ProviderQuotaDetails[]> {
  const supabase = createAdminClient();

  // Read from email_provider_health_metrics (synced from provider APIs)
  const { data, error } = await supabase
    .from("email_provider_health_metrics")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error || !data || data.length === 0) {
    if (error) console.error("Failed to fetch quota data:", error.message);
    return getDefaultQuotaDetails();
  }

  const providers: EmailProvider[] = ["resend", "brevo", "mailersend", "aws_ses"];
  const defaults = getDefaultQuotaDetails();

  return providers.map((provider) => {
    const healthRow = data.find((h) => h.provider === provider);
    const defaultQuota = defaults.find((d) => d.provider === provider)!;

    // Daily quota from health metrics (synced from provider APIs)
    const dailySent = healthRow?.daily_quota_used || 0;
    const dailyLimit = healthRow?.daily_quota_limit || defaultQuota.daily.limit;
    const dailyRemaining = Math.max(0, dailyLimit - dailySent);
    const dailyPercentUsed = dailyLimit > 0 ? (dailySent / dailyLimit) * 100 : 0;

    // Monthly quota from health metrics
    const monthlySent = healthRow?.monthly_quota_used || 0;
    const monthlyLimit = healthRow?.monthly_quota_limit || defaultQuota.monthly.limit;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlySent);
    const monthlyPercentUsed = monthlyLimit > 0 ? (monthlySent / monthlyLimit) * 100 : 0;

    return {
      provider,
      daily: {
        sent: dailySent,
        limit: dailyLimit,
        remaining: dailyRemaining,
        percentUsed: Math.round(dailyPercentUsed * 10) / 10,
      },
      monthly: {
        sent: monthlySent,
        limit: monthlyLimit,
        remaining: monthlyRemaining,
        percentUsed: Math.round(monthlyPercentUsed * 10) / 10,
      },
      isAvailable: dailyPercentUsed < 95 && monthlyPercentUsed < 95,
    };
  });
}

function getDefaultQuotaDetails(): ProviderQuotaDetails[] {
  const defaults: Array<{ provider: EmailProvider; dailyLimit: number; monthlyLimit: number }> = [
    { provider: "resend", dailyLimit: 100, monthlyLimit: 3000 },
    { provider: "brevo", dailyLimit: 300, monthlyLimit: 9000 },
    { provider: "mailersend", dailyLimit: 400, monthlyLimit: 12000 },
    { provider: "aws_ses", dailyLimit: 100, monthlyLimit: 62000 },
  ];

  return defaults.map((d) => ({
    provider: d.provider,
    daily: { sent: 0, limit: d.dailyLimit, remaining: d.dailyLimit, percentUsed: 0 },
    monthly: { sent: 0, limit: d.monthlyLimit, remaining: d.monthlyLimit, percentUsed: 0 },
    isAvailable: true,
  }));
}

// ============================================================================
// Bounce Statistics
// ============================================================================

export const getBounceStats = unstable_cache(
  async (): Promise<BounceStats> => {
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
  },
  ["bounce-stats"],
  {
    revalidate: CACHE_DURATIONS.EMAIL_STATS,
    tags: [CACHE_TAGS.EMAIL_STATS],
  }
);

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
// Campaigns
// ============================================================================

export const getRecentCampaigns = unstable_cache(
  async (limit = 10): Promise<RecentCampaign[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("newsletter_campaigns")
      .select(
        `
      id, name, subject, status, campaign_type,
      total_recipients, total_sent, total_opened, total_clicked,
      scheduled_at, sent_at, created_at
    `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to fetch campaigns:", error.message);
      return [];
    }

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      campaignType: c.campaign_type,
      totalRecipients: c.total_recipients || 0,
      totalSent: c.total_sent || 0,
      totalOpened: c.total_opened || 0,
      totalClicked: c.total_clicked || 0,
      scheduledAt: c.scheduled_at,
      sentAt: c.sent_at,
      createdAt: c.created_at,
    }));
  },
  ["recent-campaigns"],
  {
    revalidate: CACHE_DURATIONS.CAMPAIGNS,
    tags: [CACHE_TAGS.CAMPAIGNS],
  }
);

// ============================================================================
// Automations
// ============================================================================

export const getActiveAutomations = unstable_cache(
  async (): Promise<ActiveAutomation[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("email_automation_flows")
      .select(
        `
      id, name, trigger_type, status,
      total_enrolled, total_completed, total_converted
    `
      )
      .in("status", ["active", "paused"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch automations:", error.message);
      return [];
    }

    return (data || []).map((a) => ({
      id: a.id,
      name: a.name,
      triggerType: a.trigger_type,
      status: a.status,
      totalEnrolled: a.total_enrolled || 0,
      totalCompleted: a.total_completed || 0,
      totalConverted: a.total_converted || 0,
      conversionRate:
        a.total_enrolled > 0 ? Math.round((a.total_converted / a.total_enrolled) * 1000) / 10 : 0,
    }));
  },
  ["active-automations"],
  {
    revalidate: CACHE_DURATIONS.AUTOMATIONS,
    tags: [CACHE_TAGS.AUTOMATIONS],
  }
);

// ============================================================================
// Segments
// ============================================================================

export const getAudienceSegments = unstable_cache(
  async (): Promise<AudienceSegment[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase.from("audience_segments").select("*").order("name");

    if (error) {
      console.error("Failed to fetch segments:", error.message);
      return [];
    }

    return (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      cachedCount: s.cached_count || 0,
      color: s.color || "#6366f1",
      iconName: s.icon_name || "users",
      isSystem: s.is_system || false,
    }));
  },
  ["audience-segments"],
  {
    revalidate: CACHE_DURATIONS.SEGMENTS,
    tags: [CACHE_TAGS.SEGMENTS],
  }
);

// ============================================================================
// Combined Dashboard Data
// ============================================================================

export interface EmailCRMData {
  stats?: EmailDashboardStats | undefined;
  providerHealth?: ProviderHealth[] | undefined;
  campaigns?: RecentCampaign[] | undefined;
  automations?: ActiveAutomation[] | undefined;
  segments?: AudienceSegment[] | undefined;
  quotaDetails?: ProviderQuotaDetails[] | undefined;
  bounceStats?: BounceStats | undefined;
  templates?: EmailTemplate[] | undefined;
  circuitBreakers?: CircuitBreakerState[] | undefined;
  queueStats?: QueueStats | undefined;
}

export async function getEmailCRMData(): Promise<EmailCRMData> {
  const [
    stats,
    providerHealth,
    campaigns,
    automations,
    segments,
    quotaDetails,
    bounceStats,
    templates,
    circuitBreakers,
    queueStats,
  ] = await Promise.all([
    getEmailDashboardStats(),
    getProviderHealth(),
    getRecentCampaigns(),
    getActiveAutomations(),
    getAudienceSegments(),
    getComprehensiveQuotaStatus(),
    getBounceStats(),
    getEmailTemplates(),
    getCircuitBreakerStates(),
    getQueueStats(),
  ]);

  return {
    stats,
    providerHealth,
    campaigns,
    automations,
    segments,
    quotaDetails,
    bounceStats,
    templates,
    circuitBreakers,
    queueStats,
  };
}

// ============================================================================
// Email Monitoring Types (for monitor page)
// ============================================================================

export interface ProviderStatus {
  provider: string;
  state: string;
  failures: number;
  consecutive_successes: number;
  last_failure_time: string | null;
  health_score: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
}

export interface QuotaStatus {
  provider: string;
  emails_sent: number;
  daily_limit: number;
  remaining: number;
  percentage_used: number;
  date: string;
}

export interface RecentEmail {
  id: string;
  email_type: string;
  recipient_email: string;
  provider_used: string;
  status: string;
  created_at: string;
}

export interface HealthEvent {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  provider: string;
  created_at: string;
}

export interface EmailMonitoringData {
  providerStatus: ProviderStatus[];
  quotaStatus: QuotaStatus[];
  recentEmails: RecentEmail[];
  healthEvents: HealthEvent[];
}

/**
 * Get email monitoring data
 * Uses admin client to bypass RLS for admin-only tables
 */
export async function getEmailMonitoringData(): Promise<EmailMonitoringData> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const PROVIDER_LIMITS: Record<string, number> = {
    resend: 100,
    brevo: 300,
    mailersend: 400,
    aws_ses: 1000,
  };

  const [cbRes, healthRes, quotaRes, emailRes, eventRes] = await Promise.all([
    supabase.from("email_circuit_breaker").select("*"),
    supabase.from("email_provider_health_metrics").select("*"),
    supabase.from("email_provider_quota").select("*").eq("date", today),
    supabase.from("email_logs").select("*").order("created_at", { ascending: false }).limit(10),
    supabase
      .from("email_health_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const cbData = cbRes.data || [];
  const healthData = healthRes.data || [];
  const quotaData = quotaRes.data || [];
  const emailData = emailRes.data || [];
  const eventData = eventRes.data || [];

  const providerStatus: ProviderStatus[] = cbData.map((cb) => {
    const health = healthData.find((h) => h.provider === cb.provider);
    return {
      provider: cb.provider,
      state: cb.state || "closed",
      failures: cb.failures || 0,
      consecutive_successes: cb.consecutive_successes || 0,
      last_failure_time: cb.last_failure_time,
      health_score: health?.health_score || 100,
      total_requests: health?.total_requests || 0,
      successful_requests: health?.successful_requests || 0,
      failed_requests: health?.failed_requests || 0,
    };
  });

  const quotaStatus: QuotaStatus[] = quotaData.map((q) => {
    const limit = PROVIDER_LIMITS[q.provider] || 100;
    return {
      provider: q.provider,
      emails_sent: q.emails_sent || 0,
      daily_limit: limit,
      remaining: Math.max(0, limit - (q.emails_sent || 0)),
      percentage_used: ((q.emails_sent || 0) / limit) * 100,
      date: q.date,
    };
  });

  const recentEmails: RecentEmail[] = emailData.map((e) => ({
    id: e.id,
    email_type: e.email_type || "unknown",
    recipient_email: e.recipient_email || e.recipient || "",
    provider_used: e.provider_used || e.provider || "",
    status: e.status || "unknown",
    created_at: e.created_at,
  }));

  const healthEvents: HealthEvent[] = eventData.map((e) => ({
    id: e.id,
    event_type: e.event_type || "info",
    severity: e.severity || "info",
    message: e.message || "",
    provider: e.provider || "",
    created_at: e.created_at,
  }));

  // Add defaults if no data
  if (providerStatus.length === 0) {
    ["resend", "brevo", "mailersend", "aws_ses"].forEach((p) => {
      providerStatus.push({
        provider: p,
        state: "closed",
        failures: 0,
        consecutive_successes: 0,
        last_failure_time: null,
        health_score: 100,
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
      });
    });
  }

  if (quotaStatus.length === 0) {
    ["resend", "brevo", "mailersend", "aws_ses"].forEach((p) => {
      const limit = PROVIDER_LIMITS[p] || 100;
      quotaStatus.push({
        provider: p,
        emails_sent: 0,
        daily_limit: limit,
        remaining: limit,
        percentage_used: 0,
        date: today,
      });
    });
  }

  return { providerStatus, quotaStatus, recentEmails, healthEvents };
}

/**
 * Get email logs with optional filtering
 * Uses admin client to bypass RLS for admin-only data
 */
export async function getEmailLogs(params: {
  provider?: EmailProvider;
  emailType?: EmailType;
  status?: string;
  hours?: number;
}) {
  const supabase = createAdminClient();
  const hoursAgo = params.hours || 24;
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("email_logs")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.provider) {
    query = query.eq("provider", params.provider);
  }
  if (params.emailType) {
    query = query.eq("email_type", params.emailType);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getEmailLogs] Error:", error);
    return [];
  }

  return (data || []).map((log) => ({
    id: log.id,
    recipient_email: log.recipient_email,
    email_type: log.email_type,
    subject: log.subject || "",
    provider: log.provider,
    status: log.status,
    sent_at: log.created_at,
    provider_message_id: log.provider_message_id,
    error: log.error_message,
  }));
}

/**
 * Get queued emails with optional status filter
 * Uses admin client to bypass RLS for admin-only data
 */
export async function getQueuedEmails(params: { status?: string }) {
  const supabase = createAdminClient();

  let query = supabase
    .from("email_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getQueuedEmails] Error:", error);
    return [];
  }

  return (data || []).map((email) => ({
    id: email.id,
    recipient_email: email.recipient_email,
    email_type: email.email_type,
    template_name: email.template_name || "",
    attempts: email.attempts || 0,
    max_attempts: email.max_attempts || 3,
    status: email.status,
    last_error: email.last_error,
    next_retry_at: email.next_retry_at,
    created_at: email.created_at,
  }));
}

// ============================================================================
// Email Templates
// ============================================================================

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

// ============================================================================
// Circuit Breaker State
// ============================================================================

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
// Queue Statistics
// ============================================================================

export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  completed: number;
  totalToday: number;
}

/**
 * Get email queue statistics
 * Uses admin client to bypass RLS
 */
export async function getQueueStats(): Promise<QueueStats> {
  const supabase = createAdminClient();

  const [queueRes, dlqRes] = await Promise.all([
    supabase.from("email_queue").select("status"),
    supabase.from("email_dead_letter_queue").select("id", { count: "exact", head: true }),
  ]);

  const queue = queueRes.data || [];
  const statusCounts = queue.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    pending: statusCounts["pending"] || 0,
    processing: statusCounts["processing"] || 0,
    failed: statusCounts["failed"] || 0,
    deadLetter: dlqRes.count || 0,
    completed: statusCounts["completed"] || 0,
    totalToday: queue.length,
  };
}
