/**
 * Admin Email Monitoring Data Layer
 * Server-side data fetching for email provider status and metrics
 */

import { createClient } from "@/lib/supabase/server";

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
  date: string;
  emails_sent: number;
  daily_limit: number;
  remaining: number;
  percentage_used: number;
}

export interface RecentEmail {
  id: string;
  email_type: string;
  recipient_email: string;
  provider_used: string;
  status: string;
  created_at: string;
  message_id: string | null;
  error_message: string | null;
}

export interface HealthEvent {
  id: string;
  provider: string | null;
  event_type: string;
  severity: string;
  message: string;
  created_at: string;
}

export interface EmailMonitoringData {
  providerStatus: ProviderStatus[];
  quotaStatus: QuotaStatus[];
  recentEmails: RecentEmail[];
  healthEvents: HealthEvent[];
}

const PROVIDER_LIMITS: Record<string, number> = {
  resend: 100,
  mailgun: 300,
  postmark: 100,
};

/**
 * Get email provider status with health metrics
 */
export async function getProviderStatus(): Promise<ProviderStatus[]> {
  const supabase = await createClient();

  const [{ data: circuitBreakerData }, { data: healthMetricsData }] = await Promise.all([
    supabase.from("email_circuit_breaker_state").select("*").order("provider"),
    supabase.from("email_provider_health_metrics").select("*").order("provider"),
  ]);

  if (!circuitBreakerData) return [];

  return circuitBreakerData.map((cb) => {
    const health = healthMetricsData?.find((h) => h.provider === cb.provider);
    return {
      provider: cb.provider,
      state: cb.state,
      failures: cb.failures,
      consecutive_successes: cb.consecutive_successes,
      last_failure_time: cb.last_failure_time,
      health_score: health?.health_score || 0,
      total_requests: health?.total_requests || 0,
      successful_requests: health?.successful_requests || 0,
      failed_requests: health?.failed_requests || 0,
    };
  });
}

/**
 * Get daily quota status for all providers
 */
export async function getQuotaStatus(): Promise<QuotaStatus[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("email_provider_quota")
    .select("*")
    .eq("date", today)
    .order("provider");

  if (!data) return [];

  return data.map((q) => {
    const limit = PROVIDER_LIMITS[q.provider] || 100;
    const remaining = Math.max(0, limit - q.emails_sent);
    return {
      provider: q.provider,
      date: q.date,
      emails_sent: q.emails_sent,
      daily_limit: limit,
      remaining,
      percentage_used: (q.emails_sent / limit) * 100,
    };
  });
}

/**
 * Get recent email logs
 */
export async function getRecentEmails(limit = 10): Promise<RecentEmail[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Get recent health events
 */
export async function getHealthEvents(limit = 20): Promise<HealthEvent[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("email_health_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Get all email monitoring data in parallel
 */
export async function getEmailMonitoringData(): Promise<EmailMonitoringData> {
  const [providerStatus, quotaStatus, recentEmails, healthEvents] = await Promise.all([
    getProviderStatus(),
    getQuotaStatus(),
    getRecentEmails(),
    getHealthEvents(),
  ]);

  return {
    providerStatus,
    quotaStatus,
    recentEmails,
    healthEvents,
  };
}
