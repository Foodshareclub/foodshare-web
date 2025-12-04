/**
 * EmailStatsDashboard - Email system statistics and metrics
 * Shows 24h stats, success rates, and provider performance
 * Optimized with custom hooks and constants
 */

import React, { memo } from "react";

import { type EmailStats } from "@/api/admin/emailManagement";
import { useEmailStats } from "@/hooks/useEmailManagement";
import { PROVIDER_NAMES } from "@/lib/email/constants";

interface StatCardProps {
  label: string;
  value: number | string;
  colorScheme?: "green" | "blue" | "orange" | "red";
  suffix?: string;
}

const StatCard = memo<StatCardProps>(({ label, value, colorScheme = "green", suffix = "" }) => {
  const colorClasses = {
    green: "text-green-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    red: "text-red-600",
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[colorScheme]}`}>
        {value}
        {suffix}
      </p>
    </div>
  );
});

StatCard.displayName = "StatCard";

export const EmailStatsDashboard: React.FC = memo(() => {
  // Use optimized hook with auto-refresh (60s) and request cancellation
  const { stats, loading, error } = useEmailStats(true);

  if (loading && !stats) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800">{error || "Failed to load statistics"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Sent (24h)" value={stats.totalSent24h} colorScheme="blue" />
        <StatCard
          label="Failed (24h)"
          value={stats.totalFailed24h}
          colorScheme={stats.totalFailed24h > 0 ? "red" : "green"}
        />
        <StatCard
          label="Queued"
          value={stats.totalQueued}
          colorScheme={stats.totalQueued > 10 ? "orange" : "green"}
        />
        <StatCard
          label="Success Rate"
          value={stats.successRate.toFixed(1)}
          suffix="%"
          colorScheme={
            stats.successRate >= 95 ? "green" : stats.successRate >= 80 ? "orange" : "red"
          }
        />
      </div>

      {/* Provider Performance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Provider Performance (24h)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.providerStats.map((providerStat) => (
            <div key={providerStat.provider} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-3">
                {PROVIDER_NAMES[providerStat.provider as keyof typeof PROVIDER_NAMES] ||
                  providerStat.provider}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Sent
                  </span>
                  <span className="text-sm font-medium text-gray-800">{providerStat.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Failed
                  </span>
                  <span className="text-sm font-medium text-gray-800">{providerStat.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Success Rate
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      providerStat.successRate >= 95
                        ? "text-green-600"
                        : providerStat.successRate >= 80
                          ? "text-orange-600"
                          : "text-red-600"
                    }`}
                  >
                    {providerStat.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

EmailStatsDashboard.displayName = "EmailStatsDashboard";
