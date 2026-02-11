/**
 * Email Monitoring & Logging
 * Real-time monitoring data for the email monitor page
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailProvider, EmailType } from "@/lib/email/types";

// ============================================================================
// Types
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

// ============================================================================
// Monitoring Functions
// ============================================================================

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
