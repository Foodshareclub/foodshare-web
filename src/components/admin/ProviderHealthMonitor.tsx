"use client";

/**
 * Provider Health Monitor
 * Real-time monitoring of email provider health with circuit breaker status
 *
 * This is a Client Component that receives data from a Server Component parent.
 * Mutations are handled via Server Actions.
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { EmailProvider } from "@/lib/email/types";
import { PROVIDER_NAMES } from "@/lib/email/constants";
import { resetCircuitBreaker, updateProviderAvailability } from "@/app/actions/admin-email";
import type { ProviderHealth } from "@/lib/data/admin-email";

interface ProviderHealthMonitorProps {
  initialData: ProviderHealth[];
  onRefresh?: () => void;
}

export const ProviderHealthMonitor: React.FC<ProviderHealthMonitorProps> = ({
  initialData,
  onRefresh,
}) => {
  const _t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const _getCircuitStateColor = (state: string) => {
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

  const _getCircuitStateBadge = (state: string) => {
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
    if (confirm(`Reset circuit breaker for ${PROVIDER_NAMES[provider]}?`)) {
      startTransition(async () => {
        const result = await resetCircuitBreaker(provider);
        if (result.success) {
          setError(null);
          onRefresh?.();
        } else {
          setError(result.error || "Failed to reset circuit breaker");
        }
      });
    }
  };

  const handleDisable = (provider: EmailProvider) => {
    if (confirm(`Disable ${PROVIDER_NAMES[provider]}?`)) {
      startTransition(async () => {
        const result = await updateProviderAvailability(provider, false);
        if (result.success) {
          setError(null);
          onRefresh?.();
        } else {
          setError(result.error || "Failed to disable provider");
        }
      });
    }
  };

  const _handleEnable = (provider: EmailProvider) => {
    startTransition(async () => {
      const result = await updateProviderAvailability(provider, true);
      if (result.success) {
        setError(null);
        onRefresh?.();
      } else {
        setError(result.error || "Failed to enable provider");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Provider Health Monitor</h2>
          <p className="text-sm text-gray-500">
            Real-time circuit breaker status and health metrics
          </p>
        </div>
        <div className="flex gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Refreshing..." : "Refresh Now"}
            </button>
          )}
        </div>
      </div>

      {/* Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {initialData.map((health) => {
          const isHealthy = health.status === "healthy";
          const statusColor =
            health.status === "healthy"
              ? "border-green-200"
              : health.status === "degraded"
                ? "border-yellow-200"
                : "border-red-200";

          return (
            <div
              key={health.provider}
              className={`bg-white rounded-lg border-2 p-6 transition-all ${statusColor}`}
            >
              {/* Provider Name & Status */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {PROVIDER_NAMES[health.provider]}
                  </h3>
                  <p className="text-sm text-gray-500">Health Status</p>
                </div>
                <div className="flex flex-col gap-2">
                  {/* Health Indicator */}
                  <div
                    className={`w-4 h-4 rounded-full ${isHealthy ? "bg-green-500" : health.status === "degraded" ? "bg-yellow-500" : "bg-red-500"} animate-pulse`}
                  />
                </div>
              </div>

              {/* Health Score */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Health Score</span>
                  <span className="text-sm font-medium text-gray-800">
                    {health.healthScore}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${isHealthy ? "bg-green-500" : health.status === "degraded" ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${health.healthScore}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Success Rate</p>
                  <p className="text-xl font-bold text-gray-800">
                    {health.successRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Avg Latency</p>
                  <p className="text-xl font-bold text-gray-800">
                    {health.avgLatencyMs.toFixed(0)}ms
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Total Requests</p>
                  <p className="text-xl font-bold text-gray-800">{health.totalRequests}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p
                    className={`text-xl font-bold ${
                      health.status === "healthy"
                        ? "text-green-600"
                        : health.status === "degraded"
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleReset(health.provider)}
                  disabled={isPending || health.status === "healthy"}
                  className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleDisable(health.provider)}
                  disabled={isPending}
                  className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Disable
                </button>
              </div>

              {/* Warning Messages */}
              {health.status === "down" && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-800 font-medium">⚠️ Provider is currently down</p>
                </div>
              )}

              {health.status === "degraded" && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="text-xs text-orange-800 font-medium">
                    ⚠️ Provider is experiencing degraded performance
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Status Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
        <h3 className="text-lg font-bold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Healthy Providers</p>
            <p className="text-3xl font-bold">
              {initialData.filter((h) => h.status === "healthy").length}/{initialData.length}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">Average Success Rate</p>
            <p className="text-3xl font-bold">
              {initialData.length > 0
                ? (
                    initialData.reduce((sum, h) => sum + h.successRate, 0) / initialData.length
                  ).toFixed(1)
                : "0.0"}
              %
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">System Latency</p>
            <p className="text-3xl font-bold">
              {initialData.length > 0
                ? (
                    initialData.reduce((sum, h) => sum + h.avgLatencyMs, 0) / initialData.length
                  ).toFixed(0)
                : "0"}
              ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
