/**
 * Admin Email CRM Data Layer
 * Server-side data fetching for email marketing dashboard
 */

import { createClient } from "@/lib/supabase/server";

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
  activeCampaigns: number;
  activeAutomations: number;
  dailyQuotaUsed: number;
  dailyQuotaLimit: number;
}

export interface ProviderHealth {
  provider: "resend" | "brevo" | "aws_ses";
  healthScore: number;
  successRate: number;
  avgLatencyMs: number;
  totalRequests: number;
  status: "healthy" | "degraded" | "down";
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

export async function getEmailDashboardStats(): Promise<EmailDashboardStats> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel fetch for performance
  const [
    subscribersRes,
    activeSubsRes,
    registeredUsersRes,
    campaignsRes,
    quotaRes,
    automationsRes,
  ] = await Promise.all([
    // Total newsletter subscribers (external)
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
    // Active newsletter subscribers
    supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Registered users with email preferences (internal subscribers)
    supabase.from("email_preferences").select("*", { count: "exact", head: true }),
    // Campaign stats (last 30 days)
    supabase
      .from("newsletter_campaigns")
      .select("total_sent, total_opened, total_clicked, total_unsubscribed")
      .eq("status", "sent")
      .gte("sent_at", thirtyDaysAgo.toISOString()),
    // Daily quota - get most recent records per provider (handles missing today's data)
    supabase
      .from("email_provider_quota")
      .select("provider, emails_sent, daily_limit, date")
      .order("date", { ascending: false })
      .limit(9), // 3 providers * 3 days buffer
    // Active automations
    supabase
      .from("email_automation_flows")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  // Calculate aggregates
  const campaigns = campaignsRes.data || [];
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
  const totalUnsubscribed = campaigns.reduce((sum, c) => sum + (c.total_unsubscribed || 0), 0);

  // Get unique providers with most recent quota data
  const quotaData = quotaRes.data || [];
  const latestQuotaByProvider = new Map<string, { emails_sent: number; daily_limit: number }>();
  for (const q of quotaData) {
    if (!latestQuotaByProvider.has(q.provider)) {
      latestQuotaByProvider.set(q.provider, {
        emails_sent: q.emails_sent || 0,
        daily_limit: q.daily_limit || 100,
      });
    }
  }
  const quotas = Array.from(latestQuotaByProvider.values());
  const dailyUsed = quotas.reduce((sum, q) => sum + q.emails_sent, 0);
  const dailyLimit = quotas.reduce((sum, q) => sum + q.daily_limit, 0) || 500;

  // Combine newsletter subscribers + registered users with email prefs
  const totalSubs = (subscribersRes.count || 0) + (registeredUsersRes.count || 0);
  const activeSubs = (activeSubsRes.count || 0) + (registeredUsersRes.count || 0);

  return {
    totalSubscribers: totalSubs,
    activeSubscribers: activeSubs,
    emailsSent30d: totalSent,
    avgOpenRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
    avgClickRate: totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 1000) / 10 : 0,
    unsubscribeRate: totalSent > 0 ? Math.round((totalUnsubscribed / totalSent) * 1000) / 10 : 0,
    activeCampaigns: campaigns.length,
    activeAutomations: automationsRes.count || 0,
    dailyQuotaUsed: dailyUsed,
    dailyQuotaLimit: dailyLimit,
  };
}

// ============================================================================
// Provider Health
// ============================================================================

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_provider_health_metrics")
    .select("*")
    .order("last_updated", { ascending: false });

  if (!data || data.length === 0) {
    // Return defaults if no metrics
    return [
      {
        provider: "brevo",
        healthScore: 100,
        successRate: 100,
        avgLatencyMs: 0,
        totalRequests: 0,
        status: "healthy",
      },
      {
        provider: "resend",
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
    provider: m.provider as "resend" | "brevo" | "aws_ses",
    healthScore: m.health_score || 100,
    successRate:
      m.total_requests > 0
        ? Math.round((m.successful_requests / m.total_requests) * 1000) / 10
        : 100,
    avgLatencyMs: Number(m.average_latency_ms) || 0,
    totalRequests: m.total_requests || 0,
    status: m.health_score >= 80 ? "healthy" : m.health_score >= 50 ? "degraded" : "down",
  }));
}

// ============================================================================
// Campaigns
// ============================================================================

export async function getRecentCampaigns(limit = 10): Promise<RecentCampaign[]> {
  const supabase = await createClient();

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
}

// ============================================================================
// Automations
// ============================================================================

export async function getActiveAutomations(): Promise<ActiveAutomation[]> {
  const supabase = await createClient();

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
}

// ============================================================================
// Segments
// ============================================================================

export async function getAudienceSegments(): Promise<AudienceSegment[]> {
  const supabase = await createClient();

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
}

// ============================================================================
// Combined Dashboard Data
// ============================================================================

export interface EmailCRMData {
  stats: EmailDashboardStats;
  providerHealth: ProviderHealth[];
  campaigns: RecentCampaign[];
  automations: ActiveAutomation[];
  segments: AudienceSegment[];
}

export async function getEmailCRMData(): Promise<EmailCRMData> {
  const [stats, providerHealth, campaigns, automations, segments] = await Promise.all([
    getEmailDashboardStats(),
    getProviderHealth(),
    getRecentCampaigns(),
    getActiveAutomations(),
    getAudienceSegments(),
  ]);

  return { stats, providerHealth, campaigns, automations, segments };
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

export async function getEmailMonitoringData(): Promise<EmailMonitoringData> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const PROVIDER_LIMITS: Record<string, number> = { resend: 100, brevo: 300, aws_ses: 1000 };

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
    ["brevo", "resend"].forEach((p) => {
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
    ["brevo", "resend"].forEach((p) => {
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
