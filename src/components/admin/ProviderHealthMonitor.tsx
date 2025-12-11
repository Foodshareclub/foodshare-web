"use client";

/**
 * Provider Health Monitor
 * Real-time monitoring of email provider health with circuit breaker status
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { EmailProvider } from "@/lib/email/types";
import { PROVIDER_NAMES } from "@/lib/email/constants";

interface ProviderHealth {
  provider: EmailProvider;
  isHealthy: boolean;
  circuitState: "closed" | "open" | "half-open";
  recentFailures: number;
  successRate: number;
  averageLatency: number;
  isAvailable: boolean;
  lastChecked: Date;
}

interface ProviderHealthMonitorProps {
  onReset?: (provider: EmailProvider) => void;
  onDisable?: (provider: EmailProvider, duration: number) => void;
}

export const ProviderHealthMonitor: React.FC<ProviderHealthMonitorProps> = ({
  onReset,
  onDisable,
}) => {
  const t = useTranslations();
  const [healthStatus, setHealthStatus] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthStatus = useCallback(async () => {
    try {
      // This would call your enhanced email service's getHealthStatus method
      // For now, returning mock data structure
      const response = await fetch("/api/admin/email-health");
      const data = await response.json();

      if (data.health) {
        const providers: EmailProvider[] = ["resend", "brevo", "aws_ses"];
        const healthData: ProviderHealth[] = providers.map((provider) => ({
          provider,
          isHealthy: data.health[provider]?.isHealthy ?? false,
          circuitState: data.health[provider]?.circuitState ?? "closed",
          recentFailures: data.health[provider]?.recentFailures ?? 0,
          successRate: data.health[provider]?.successRate ?? 0,
          averageLatency: data.health[provider]?.averageLatency ?? 0,
          isAvailable: data.health[provider]?.isAvailable ?? false,
          lastChecked: new Date(),
        }));

        setHealthStatus(healthData);
      }
    } catch (error) {
      console.error("Failed to fetch health status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthStatus();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthStatus]);

  const getCircuitStateColor = (state: string) => {
    switch (state) {
      case "closed":
        return "bg-green-500";
      case "open":
        return "bg-red-500";
      case "half-open":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCircuitStateBadge = (state: string) => {
    switch (state) {
      case "closed":
        return "bg-green-100 text-green-800";
      case "open":
        return "bg-red-100 text-red-800";
      case "half-open":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleReset = (provider: EmailProvider) => {
    if (confirm(t("reset_circuit_breaker_confirm", { provider: PROVIDER_NAMES[provider] }))) {
      onReset?.(provider);
      fetchHealthStatus();
    }
  };

  const handleDisable = (provider: EmailProvider) => {
    const duration = prompt(t("disable_duration_prompt"), "60");
    if (duration) {
      const durationMs = parseInt(duration) * 60 * 1000;
      onDisable?.(provider, durationMs);
      fetchHealthStatus();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Loading health status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Provider Health Monitor</h2>
          <p className="text-sm text-gray-500">
            Real-time circuit breaker status and health metrics
          </p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealthStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {healthStatus.map((health) => (
          <div
            key={health.provider}
            className={`bg-white rounded-lg border-2 p-6 transition-all ${
              health.isHealthy ? "border-green-200" : "border-red-200"
            }`}
          >
            {/* Provider Name & Status */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {PROVIDER_NAMES[health.provider]}
                </h3>
                <p className="text-sm text-gray-500">
                  Last checked: {health.lastChecked.toLocaleTimeString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {/* Health Indicator */}
                <div
                  className={`w-4 h-4 rounded-full ${health.isHealthy ? "bg-green-500" : "bg-red-500"} animate-pulse`}
                />
              </div>
            </div>

            {/* Circuit State */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Circuit Breaker</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getCircuitStateBadge(health.circuitState)}`}
                >
                  {health.circuitState}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-full rounded-full ${getCircuitStateColor(health.circuitState)}`}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                <p className="text-xl font-bold text-gray-800">
                  {(health.successRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 mb-1">Avg Latency</p>
                <p className="text-xl font-bold text-gray-800">
                  {health.averageLatency.toFixed(0)}ms
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 mb-1">Recent Failures</p>
                <p
                  className={`text-xl font-bold ${health.recentFailures > 0 ? "text-red-600" : "text-gray-800"}`}
                >
                  {health.recentFailures}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs text-gray-500 mb-1">Quota Status</p>
                <p
                  className={`text-xl font-bold ${health.isAvailable ? "text-green-600" : "text-red-600"}`}
                >
                  {health.isAvailable ? t("ok") : t("full")}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleReset(health.provider)}
                disabled={health.circuitState === "closed"}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => handleDisable(health.provider)}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
              >
                Disable
              </button>
            </div>

            {/* Warning Messages */}
            {!health.isHealthy && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️{" "}
                  {health.circuitState === "open"
                    ? t("circuit_breaker_open")
                    : t("provider_experiencing_issues")}
                </p>
              </div>
            )}

            {!health.isAvailable && health.isHealthy && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <p className="text-xs text-orange-800 font-medium">⚠️ Daily quota exhausted</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* System Status Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
        <h3 className="text-lg font-bold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Healthy Providers</p>
            <p className="text-3xl font-bold">
              {healthStatus.filter((h) => h.isHealthy).length}/{healthStatus.length}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">Average Success Rate</p>
            <p className="text-3xl font-bold">
              {(
                (healthStatus.reduce((sum, h) => sum + h.successRate, 0) / healthStatus.length) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">System Latency</p>
            <p className="text-3xl font-bold">
              {(
                healthStatus.reduce((sum, h) => sum + h.averageLatency, 0) / healthStatus.length
              ).toFixed(0)}
              ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
