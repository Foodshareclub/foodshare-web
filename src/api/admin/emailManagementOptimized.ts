/**
 * Optimized Admin Email Management API
 * Features: Request caching, deduplication, retry logic, performance tracking
 */

import { supabase } from "@/lib/supabase/client";
import type { EmailProvider, EmailType } from "@/lib/email/types";
import { measurePerformance } from "@/lib/performance/monitoring";
import type {
  ProviderQuotaStatus,
  EmailLogEntry,
  QueuedEmailEntry,
  EmailStats,
  ManualEmailRequest,
} from "./emailManagement";

// Cache configuration
const CACHE_DURATION = {
  QUOTAS: 30000, // 30 seconds
  STATS: 60000, // 1 minute
  LOGS: 15000, // 15 seconds
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, duration: number): void {
    const timestamp = Date.now();
    this.cache.set(key, {
      data,
      timestamp,
      expiresAt: timestamp + duration,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(pattern?: RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

const apiCache = new APICache();

// Request deduplication
const pendingRequests = new Map<string, Promise<unknown>>();

async function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  // Check if request is already pending
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  // Execute request and cache promise
  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Get current quota status for all providers (with caching)
 */
export async function getProviderQuotasOptimized(): Promise<ProviderQuotaStatus[]> {
  const cacheKey = "provider-quotas";

  // Check cache first
  const cached = apiCache.get<ProviderQuotaStatus[]>(cacheKey);
  if (cached) {
    return cached;
  }

  return deduplicateRequest(cacheKey, async () => {
    return measurePerformance("api-get-provider-quotas", async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("email_provider_quota")
        .select("*")
        .eq("date", today)
        .order("provider");

      if (error) throw error;

      interface RawQuotaData {
        provider: EmailProvider;
        emails_sent: number;
        daily_limit: number;
        date: string;
      }

      const result = ((data || []) as RawQuotaData[]).map((quota) => {
        const remaining = quota.daily_limit - quota.emails_sent;
        const usagePercentage = (quota.emails_sent / quota.daily_limit) * 100;

        let status: "ok" | "warning" | "exhausted" = "ok";
        if (quota.emails_sent >= quota.daily_limit) {
          status = "exhausted";
        } else if (usagePercentage >= 80) {
          status = "warning";
        }

        return {
          provider: quota.provider,
          emails_sent: quota.emails_sent,
          daily_limit: quota.daily_limit,
          remaining,
          usage_percentage: usagePercentage,
          date: quota.date,
          status,
        };
      });

      // Cache the result
      apiCache.set(cacheKey, result, CACHE_DURATION.QUOTAS);
      return result;
    });
  });
}

/**
 * Get recent email logs with filtering (with caching)
 */
export async function getEmailLogsOptimized(params: {
  limit?: number;
  provider?: EmailProvider;
  emailType?: EmailType;
  status?: string;
  hours?: number;
}): Promise<EmailLogEntry[]> {
  const { limit = 50, provider, emailType, status, hours = 24 } = params;
  const cacheKey = `email-logs-${JSON.stringify(params)}`;

  // Check cache first
  const cached = apiCache.get<EmailLogEntry[]>(cacheKey);
  if (cached) {
    return cached;
  }

  return deduplicateRequest(cacheKey, async () => {
    return measurePerformance("api-get-email-logs", async () => {
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

      const result = data || [];

      // Cache the result
      apiCache.set(cacheKey, result, CACHE_DURATION.LOGS);
      return result;
    });
  });
}

/**
 * Get queued emails (with caching)
 */
export async function getQueuedEmailsOptimized(params: {
  limit?: number;
  status?: string;
}): Promise<QueuedEmailEntry[]> {
  const { limit = 50, status } = params;
  const cacheKey = `queued-emails-${JSON.stringify(params)}`;

  // Check cache first
  const cached = apiCache.get<QueuedEmailEntry[]>(cacheKey);
  if (cached) {
    return cached;
  }

  return deduplicateRequest(cacheKey, async () => {
    return measurePerformance("api-get-queued-emails", async () => {
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

      const result = data || [];

      // Cache the result (shorter duration for queue)
      apiCache.set(cacheKey, result, 10000); // 10 seconds
      return result;
    });
  });
}

/**
 * Get email statistics for dashboard (with caching)
 */
export async function getEmailStatsOptimized(): Promise<EmailStats> {
  const cacheKey = "email-stats";

  // Check cache first
  const cached = apiCache.get<EmailStats>(cacheKey);
  if (cached) {
    return cached;
  }

  return deduplicateRequest(cacheKey, async () => {
    return measurePerformance("api-get-email-stats", async () => {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Parallel queries for better performance
      const [logsResult, queueResult] = await Promise.all([
        supabase.from("email_logs").select("*").gte("sent_at", last24h),
        supabase
          .from("email_queue")
          .select("*", { count: "exact", head: true })
          .eq("status", "queued"),
      ]);

      if (logsResult.error) throw logsResult.error;
      if (queueResult.error) throw queueResult.error;

      interface RawEmailLog {
        id: string;
        status: string;
        provider: EmailProvider;
        sent_at: string;
      }

      const logs = (logsResult.data || []) as RawEmailLog[];
      const totalSent24h = logs.length;
      const totalFailed24h = logs.filter(
        (l) => l.status === "failed" || l.status === "bounced"
      ).length;
      const successRate =
        totalSent24h > 0 ? ((totalSent24h - totalFailed24h) / totalSent24h) * 100 : 100;

      // Provider-specific stats
      const providerStats = (["resend", "brevo", "aws_ses"] as EmailProvider[]).map((provider) => {
        const providerLogs = logs.filter((l) => l.provider === provider);
        const sent = providerLogs.length;
        const failed = providerLogs.filter(
          (l) => l.status === "failed" || l.status === "bounced"
        ).length;
        const providerSuccessRate = sent > 0 ? ((sent - failed) / sent) * 100 : 100;

        return {
          provider,
          sent,
          failed,
          successRate: providerSuccessRate,
        };
      });

      const result: EmailStats = {
        totalSent24h,
        totalFailed24h,
        totalQueued: queueResult.count || 0,
        successRate,
        providerStats,
      };

      // Cache the result
      apiCache.set(cacheKey, result, CACHE_DURATION.STATS);
      return result;
    });
  });
}

/**
 * Retry a failed email (invalidates cache)
 */
export async function retryEmailOptimized(queueId: string): Promise<void> {
  return measurePerformance("api-retry-email", async () => {
    const { error } = await supabase
      .from("email_queue")
      .update({
        status: "queued",
        next_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", queueId);

    if (error) throw error;

    // Invalidate queue cache
    apiCache.clear(/^queued-emails/);
  });
}

/**
 * Delete a failed email from queue (invalidates cache)
 */
export async function deleteQueuedEmailOptimized(queueId: string): Promise<void> {
  return measurePerformance("api-delete-email", async () => {
    const { error } = await supabase.from("email_queue").delete().eq("id", queueId);

    if (error) throw error;

    // Invalidate queue cache
    apiCache.clear(/^queued-emails/);
  });
}

/**
 * Send a manual email (invalidates cache)
 */
export async function sendManualEmailOptimized(
  request: ManualEmailRequest
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return measurePerformance("api-send-manual-email", async () => {
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

    // Invalidate caches
    apiCache.clear(/^queued-emails/);
    apiCache.clear(/^email-stats/);

    return { success: true, messageId: data.id };
  });
}

/**
 * Prefetch data for better UX
 */
export async function prefetchEmailCRMData(): Promise<void> {
  // Prefetch all main data in parallel
  await Promise.allSettled([
    getProviderQuotasOptimized(),
    getEmailStatsOptimized(),
    getEmailLogsOptimized({ hours: 24 }),
    getQueuedEmailsOptimized({}),
  ]);
}

/**
 * Clear all caches
 */
export function clearEmailCRMCache(): void {
  apiCache.clear();
}

/**
 * Export cache instance for advanced usage
 */
export { apiCache };
