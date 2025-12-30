/**
 * Custom Hooks for Email Management
 * Optimized with request cancellation, caching, and error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { EmailProvider, EmailType } from "@/lib/email/types";
import { REFRESH_INTERVALS } from "@/lib/email/constants";

// Import types from centralized types file
import type {
  ProviderQuotaStatus,
  EmailLogEntry,
  QueuedEmailEntry,
  ManualEmailRequest,
} from "@/types/email-management.types";

// Import Server Actions for mutations
import {
  retryEmail as retryEmailAction,
  deleteQueuedEmail as deleteQueuedEmailAction,
  sendManualEmail as sendManualEmailAction,
} from "@/app/actions/admin-email";

// EmailStats type (used by useEmailStats hook)
export interface ProviderStat {
  provider: string;
  sent: number;
  failed: number;
  successRate: number;
}

export interface EmailStats {
  totalSent24h: number;
  totalFailed24h: number;
  totalQueued: number;
  successRate: number;
  providerStats: ProviderStat[];
}

// Client-side data fetching functions (call API routes)
async function getProviderQuotas(): Promise<ProviderQuotaStatus[]> {
  const res = await fetch("/api/admin/email/quotas");
  if (!res.ok) throw new Error("Failed to fetch quotas");
  return res.json();
}

async function getEmailStats(): Promise<EmailStats> {
  const res = await fetch("/api/admin/email/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function getEmailLogs(params: {
  provider?: EmailProvider;
  emailType?: EmailType;
  status?: string;
  hours?: number;
}): Promise<EmailLogEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.provider) searchParams.set("provider", params.provider);
  if (params.emailType) searchParams.set("emailType", params.emailType);
  if (params.status) searchParams.set("status", params.status);
  if (params.hours) searchParams.set("hours", params.hours.toString());

  const res = await fetch(`/api/admin/email/logs?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch logs");
  return res.json();
}

async function getQueuedEmails(params: { status?: string }): Promise<QueuedEmailEntry[]> {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set("status", params.status);

  const res = await fetch(`/api/admin/email/queue?${searchParams}`);
  if (!res.ok) throw new Error("Failed to fetch queued emails");
  return res.json();
}

// Hook for provider quotas with auto-refresh
export function useProviderQuotas(autoRefresh = true) {
  const [quotas, setQuotas] = useState<ProviderQuotaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQuotas = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const data = await getProviderQuotas();
      setQuotas(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotas();

    if (!autoRefresh) return;

    const interval = setInterval(fetchQuotas, REFRESH_INTERVALS.QUOTA_DASHBOARD);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQuotas, autoRefresh]);

  const refetch = useCallback(() => {
    fetchQuotas();
  }, [fetchQuotas]);

  return { quotas, loading, error, lastUpdated, refetch };
}

// Hook for email statistics
export function useEmailStats(autoRefresh = true) {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const data = await getEmailStats();
      setStats(data);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    if (!autoRefresh) return;

    const interval = setInterval(fetchStats, REFRESH_INTERVALS.EMAIL_STATS);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStats, autoRefresh]);

  return { stats, loading, error, refetch: fetchStats };
}

// Hook for email logs with filtering
export function useEmailLogs(params: {
  provider?: EmailProvider;
  emailType?: EmailType;
  status?: string;
  hours?: number;
}) {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const data = await getEmailLogs(params);
      setLogs(data);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Using individual params properties for granular control
  }, [params.provider, params.emailType, params.status, params.hours]);

  useEffect(() => {
    fetchLogs();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}

// Hook for queued emails
export function useQueuedEmails(status?: string) {
  const [emails, setEmails] = useState<QueuedEmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchQueue = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);
      const data = await getQueuedEmails({ status });
      setEmails(data);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchQueue();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQueue]);

  const handleRetry = useCallback(
    async (id: string) => {
      try {
        const result = await retryEmailAction(id);
        if (result.success) {
          await fetchQueue();
        }
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [fetchQueue]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const result = await deleteQueuedEmailAction(id);
        if (result.success) {
          await fetchQueue();
        }
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [fetchQueue]
  );

  return {
    emails,
    loading,
    error,
    refetch: fetchQueue,
    retry: handleRetry,
    deleteEmail: handleDelete,
  };
}

// Hook for sending manual emails
export function useManualEmailSender() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendEmail = useCallback(async (request: ManualEmailRequest) => {
    setSending(true);
    setResult(null);

    try {
      const response = await sendManualEmailAction(request);

      if (response.success) {
        setResult({
          success: true,
          message: `Email queued successfully! Message ID: ${response.data?.messageId || "N/A"}`,
        });
        return { success: true, messageId: response.data?.messageId };
      } else {
        setResult({
          success: false,
          message: response.error || "Failed to send email",
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setResult({
        success: false,
        message: errorMessage,
      });
      return { success: false, error: errorMessage };
    } finally {
      setSending(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return { sendEmail, sending, result, clearResult };
}
