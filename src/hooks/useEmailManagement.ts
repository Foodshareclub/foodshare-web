/**
 * Custom Hooks for Email Management
 * Optimized with request cancellation, caching, and error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getProviderQuotas,
  getEmailStats,
  getEmailLogs,
  getQueuedEmails,
  sendManualEmail,
  retryEmail,
  deleteQueuedEmail,
  type ProviderQuotaStatus,
  type EmailStats,
  type EmailLogEntry,
  type QueuedEmailEntry,
  type ManualEmailRequest,
} from "@/api/admin/emailManagement";
import type { EmailProvider, EmailType } from "@/lib/email/types";
import { REFRESH_INTERVALS } from "@/lib/email/constants";

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
        await retryEmail(id);
        await fetchQueue();
        return { success: true };
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
        await deleteQueuedEmail(id);
        await fetchQueue();
        return { success: true };
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
      const response = await sendManualEmail(request);

      if (response.success) {
        setResult({
          success: true,
          message: `Email queued successfully! Message ID: ${response.messageId}`,
        });
        return { success: true, messageId: response.messageId };
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

// Hook for debounced value (useful for search/filter)
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for local storage with JSON serialization
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error loading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}
