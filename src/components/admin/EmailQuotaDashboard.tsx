/**
 * EmailQuotaDashboard - Visual quota monitoring for email providers
 * Real-time display of provider quotas with status indicators
 * Optimized with custom hooks and request cancellation
 */

import React from "react";
import { useTranslations } from "next-intl";
import { useProviderQuotas } from "@/hooks/useEmailManagement";
import { PROVIDER_NAMES } from "@/lib/email/constants";

// Local type definitions (previously in @/api/admin/emailManagement)
export interface ProviderQuotaStatus {
  provider: string;
  status: "ok" | "warning" | "exhausted";
  usage_percentage: number;
  emails_sent: number;
  remaining: number;
  daily_limit: number;
}

interface QuotaMeterProps {
  quota: ProviderQuotaStatus;
}

function QuotaMeter({ quota }: QuotaMeterProps) {
  const t = useTranslations();
  const getStatusColor = () => {
    switch (quota.status) {
      case "exhausted":
        return "bg-red-500";
      case "warning":
        return "bg-orange-500";
      default:
        return "bg-green-500";
    }
  };

  const getStatusBadgeColor = () => {
    switch (quota.status) {
      case "exhausted":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getProviderDisplayName = (provider: string) => {
    return PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES] || provider;
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">
          {getProviderDisplayName(quota.provider)}
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusBadgeColor()}`}
        >
          {quota.status === "exhausted"
            ? t("exhausted")
            : quota.status === "warning"
              ? t("warning")
              : t("ok")}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full ${getStatusColor()} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(quota.usage_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Sent Today</p>
          <p className="text-2xl font-bold text-gray-800">{quota.emails_sent}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className="text-2xl font-bold text-gray-800">{quota.remaining}</p>
        </div>
      </div>

      {/* Limit Info */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">Daily Limit</p>
          <p className="text-sm font-medium text-gray-800">{quota.daily_limit}</p>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-sm text-gray-600">Usage</p>
          <p className="text-sm font-medium text-gray-800">{quota.usage_percentage.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

export function EmailQuotaDashboard() {
  const _t = useTranslations();
  // Use optimized hook with auto-refresh and request cancellation
  const { quotas, loading, error, lastUpdated, refetch } = useProviderQuotas(true);

  // Calculate total stats
  const totalCapacity = quotas.reduce((sum, q) => sum + q.daily_limit, 0);
  const totalUsed = quotas.reduce((sum, q) => sum + q.emails_sent, 0);
  const totalRemaining = totalCapacity - totalUsed;
  const totalUsagePercentage = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;
  const totalStats = { totalCapacity, totalUsed, totalRemaining, totalUsagePercentage };

  if (loading && quotas.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        <p className="mt-4 text-gray-600">Loading quota data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Error loading quota data</p>
        <p className="text-red-600 text-sm mt-2">{error}</p>
        <button
          onClick={refetch}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Email Provider Quotas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Total Capacity Summary */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white shadow-lg">
        <h3 className="text-lg font-bold mb-4">Total Daily Capacity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Total Limit</p>
            <p className="text-3xl font-bold">{totalStats.totalCapacity}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">Used Today</p>
            <p className="text-3xl font-bold">{totalStats.totalUsed}</p>
          </div>
          <div>
            <p className="text-sm opacity-90 mb-1">Remaining</p>
            <p className="text-3xl font-bold">{totalStats.totalRemaining}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${Math.min(totalStats.totalUsagePercentage, 100)}%` }}
            />
          </div>
          <p className="text-sm mt-2 opacity-90">
            {totalStats.totalUsagePercentage.toFixed(1)}% of daily capacity used
          </p>
        </div>
      </div>

      {/* Provider Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quotas.map((quota) => (
          <QuotaMeter key={quota.provider} quota={quota} />
        ))}
      </div>
    </div>
  );
}
