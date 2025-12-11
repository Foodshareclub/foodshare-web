"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  EmailMonitoringData,
  ProviderStatus,
  QuotaStatus,
  RecentEmail,
  HealthEvent,
} from "@/lib/data/admin-email";

interface Props {
  initialData: EmailMonitoringData;
}

const PROVIDER_LIMITS: Record<string, number> = {
  resend: 100,
  mailgun: 300,
  postmark: 100,
};

export function EmailMonitorClient({ initialData }: Props) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[]>(
    initialData.providerStatus
  );
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus[]>(initialData.quotaStatus);
  const [recentEmails, setRecentEmails] = useState<RecentEmail[]>(initialData.recentEmails);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>(initialData.healthEvents);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchProviderStatus = async () => {
    const [{ data: circuitBreakerData }, { data: healthMetricsData }] = await Promise.all([
      supabase.from("email_circuit_breaker_state").select("*").order("provider"),
      supabase.from("email_provider_health_metrics").select("*").order("provider"),
    ]);

    if (circuitBreakerData && healthMetricsData) {
      const combined = circuitBreakerData.map((cb) => {
        const health = healthMetricsData.find((h) => h.provider === cb.provider);
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
      setProviderStatus(combined);
    }
  };

  const fetchQuotaStatus = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("email_provider_quota")
      .select("*")
      .eq("date", today)
      .order("provider");

    if (data) {
      const quotas = data.map((q) => {
        const limit = PROVIDER_LIMITS[q.provider] || 100;
        const remaining = limit - q.emails_sent;
        return {
          ...q,
          daily_limit: limit,
          remaining: Math.max(0, remaining),
          percentage_used: (q.emails_sent / limit) * 100,
        };
      });
      setQuotaStatus(quotas);
    }
  };

  const fetchRecentEmails = async () => {
    const { data } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setRecentEmails(data);
  };

  const fetchHealthEvents = async () => {
    const { data } = await supabase
      .from("email_health_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setHealthEvents(data);
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchProviderStatus(),
      fetchQuotaStatus(),
      fetchRecentEmails(),
      fetchHealthEvents(),
    ]);
    setLoading(false);
     
  }, []);

  useEffect(() => {
    // Only set up interval for auto-refresh (initial data comes from props)
    if (autoRefresh) {
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchAllData]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "closed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "half_open":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "open":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "queued":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Email Monitoring Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-muted-foreground">Auto-refresh (30s)</span>
          </label>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Now"}
          </button>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providerStatus.map((provider) => (
          <div key={provider.provider} className="bg-card rounded-lg shadow p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold capitalize text-card-foreground">
                {provider.provider}
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(provider.state)}`}
              >
                {provider.state.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Health Score</span>
                <span className="text-sm font-medium">{provider.health_score.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-medium">
                  {provider.total_requests > 0
                    ? ((provider.successful_requests / provider.total_requests) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <span className="text-sm font-medium">{provider.total_requests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Failures</span>
                <span className="text-sm font-medium text-destructive">{provider.failures}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quota Status */}
      <div className="bg-card rounded-lg shadow p-6 border">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">Daily Quota Status</h2>
        <div className="space-y-4">
          {quotaStatus.map((quota) => (
            <div key={quota.provider}>
              <div className="flex justify-between mb-2">
                <span className="font-medium capitalize text-card-foreground">
                  {quota.provider}
                </span>
                <span className="text-sm text-muted-foreground">
                  {quota.emails_sent} / {quota.daily_limit} ({quota.percentage_used.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    quota.percentage_used > 80 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, quota.percentage_used)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Emails */}
      <div className="bg-card rounded-lg shadow p-6 border">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">Recent Emails</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground">Time</th>
                <th className="text-left py-2 text-muted-foreground">Type</th>
                <th className="text-left py-2 text-muted-foreground">Recipient</th>
                <th className="text-left py-2 text-muted-foreground">Provider</th>
                <th className="text-left py-2 text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEmails.map((email) => (
                <tr key={email.id} className="border-b hover:bg-muted/50">
                  <td className="py-2 text-sm">
                    {new Date(email.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-2 text-sm">{email.email_type}</td>
                  <td className="py-2 text-sm">{email.recipient_email}</td>
                  <td className="py-2 text-sm capitalize">{email.provider_used}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(email.status)}`}>
                      {email.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Events */}
      <div className="bg-card rounded-lg shadow p-6 border">
        <h2 className="text-xl font-semibold mb-4 text-card-foreground">Health Events</h2>
        <div className="space-y-2">
          {healthEvents.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded border-l-4 ${
                event.severity === "critical"
                  ? "border-destructive bg-destructive/10"
                  : event.severity === "warning"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-primary bg-primary/10"
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <span className="font-medium">{event.event_type}</span>
                  {event.provider && (
                    <span className="ml-2 text-muted-foreground">({event.provider})</span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
