/**
 * Admin Email Management API
 * Functions for managing email system from admin CRM
 */

import { supabase } from "@/lib/supabase/client";
import type { EmailProvider, EmailType } from "@/lib/email/types";

export interface ProviderQuotaStatus {
  provider: EmailProvider;
  emails_sent: number;
  daily_limit: number;
  remaining: number;
  usage_percentage: number;
  date: string;
  status: "ok" | "warning" | "exhausted";
}

export interface EmailLogEntry {
  id: string;
  recipient_email: string;
  email_type: EmailType;
  subject: string;
  provider: EmailProvider;
  status: string;
  sent_at: string;
  provider_message_id?: string;
  error?: string;
}

export interface QueuedEmailEntry {
  id: string;
  recipient_email: string;
  email_type: EmailType;
  template_name: string;
  attempts: number;
  max_attempts: number;
  status: string;
  last_error?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface EmailStats {
  totalSent24h: number;
  totalFailed24h: number;
  totalQueued: number;
  successRate: number;
  providerStats: {
    provider: EmailProvider;
    sent: number;
    failed: number;
    successRate: number;
  }[];
}

/**
 * Get current quota status for all providers
 */
export async function getProviderQuotas(): Promise<ProviderQuotaStatus[]> {
  // Call the edge function to get real-time merged quota data (Live API + DB)
  const { data, error: invokeError } = await supabase.functions.invoke("monitor-email-health", {
    method: "GET",
    // No params needed, defaults to action=full which fetches quotas
  });

  if (invokeError) throw invokeError;

  // Map the edge function response to ProviderQuotaStatus
  // Response format: { success: true, quotas: [...], summary: ... }

  const quotas = data.quotas || [];
  const today = new Date().toISOString().split("T")[0];

  interface EdgeFunctionQuota {
    provider: string;
    daily?: {
      sent: number;
      limit: number;
      remaining: number;
      percentUsed: number;
    };
  }

  return quotas.map((q: EdgeFunctionQuota) => {
    // Edge function returns detailed structure:
    // daily: { sent, limit, remaining, percentUsed }

    // Safety check for missing data
    const daily = q.daily || { sent: 0, limit: 100, remaining: 100, percentUsed: 0 };

    let status: "ok" | "warning" | "exhausted" = "ok";
    if (daily.sent >= daily.limit && daily.limit > 0) {
      status = "exhausted";
    } else if (daily.percentUsed >= 80) {
      status = "warning";
    }

    return {
      provider: q.provider as EmailProvider,
      emails_sent: daily.sent,
      daily_limit: daily.limit,
      remaining: daily.remaining,
      usage_percentage: daily.percentUsed,
      date: today, // Edge function doesn't return date, implies current
      status,
    };
  });
}

/**
 * Get recent email logs with filtering
 */
export async function getEmailLogs(params: {
  limit?: number;
  provider?: EmailProvider;
  emailType?: EmailType;
  status?: string;
  hours?: number;
}): Promise<EmailLogEntry[]> {
  const { limit = 50, provider, emailType, status, hours = 24 } = params;

  let query = supabase
    .from("email_logs")
    .select("*")
    .gte("sent_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (provider) {
    query = query.eq("provider", provider);
  }

  if (emailType) {
    query = query.eq("email_type", emailType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

/**
 * Get queued emails
 */
export async function getQueuedEmails(params: {
  limit?: number;
  status?: string;
}): Promise<QueuedEmailEntry[]> {
  const { limit = 50, status } = params;

  let query = supabase
    .from("email_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

/**
 * Get email statistics for dashboard
 */
export async function getEmailStats(): Promise<EmailStats> {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get 24h stats
  const { data: logs, error: logsError } = await supabase
    .from("email_logs")
    .select("*")
    .gte("sent_at", last24h);

  if (logsError) throw logsError;

  // Get queue stats
  const { count: queuedCount, error: queueError } = await supabase
    .from("email_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "queued");

  if (queueError) throw queueError;

  interface LogEntry {
    status: string;
    provider: string;
  }

  const totalSent24h = logs?.length || 0;
  const totalFailed24h =
    logs?.filter((l: LogEntry) => l.status === "failed" || l.status === "bounced").length || 0;
  const successRate =
    totalSent24h > 0 ? ((totalSent24h - totalFailed24h) / totalSent24h) * 100 : 100;

  // Provider-specific stats
  const providerStats = ["resend", "brevo", "aws_ses"].map((provider) => {
    const providerLogs = logs?.filter((l: LogEntry) => l.provider === provider) || [];
    const sent = providerLogs.length;
    const failed = providerLogs.filter(
      (l: LogEntry) => l.status === "failed" || l.status === "bounced"
    ).length;
    const providerSuccessRate = sent > 0 ? ((sent - failed) / sent) * 100 : 100;

    return {
      provider: provider as EmailProvider,
      sent,
      failed,
      successRate: providerSuccessRate,
    };
  });

  return {
    totalSent24h,
    totalFailed24h,
    totalQueued: queuedCount || 0,
    successRate,
    providerStats,
  };
}

/**
 * Retry a failed email
 */
export async function retryEmail(queueId: string): Promise<void> {
  const { error } = await supabase
    .from("email_queue")
    .update({
      status: "queued",
      next_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  if (error) throw error;
}

/**
 * Delete a failed email from queue
 */
export async function deleteQueuedEmail(queueId: string): Promise<void> {
  const { error } = await supabase.from("email_queue").delete().eq("id", queueId);

  if (error) throw error;
}

/**
 * Send a manual email (admin only)
 */
export interface ManualEmailRequest {
  to: string;
  subject: string;
  html: string;
  emailType: EmailType;
  provider?: EmailProvider;
}

export async function sendManualEmail(
  request: ManualEmailRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Queue the email
  const { data, error } = await supabase
    .from("email_queue")
    .insert({
      recipient_email: request.to,
      email_type: request.emailType,
      template_name: "manual_admin_email",
      template_data: {
        subject: request.subject,
        html: request.html,
        from: "admin@foodshare.app",
      },
      status: "queued",
      next_retry_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data.id };
}

/**
 * Reset provider quota (admin only - use with caution)
 */
export async function resetProviderQuota(provider: EmailProvider, date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("email_provider_quota")
    .update({ emails_sent: 0 })
    .eq("provider", provider)
    .eq("date", targetDate);

  if (error) throw error;
}
