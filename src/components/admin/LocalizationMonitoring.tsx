'use client';

/**
 * Localization Monitoring Dashboard
 *
 * Admin dashboard for monitoring localization edge function performance
 */

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

interface LocaleStats {
  locale: string;
  requests: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errors: number;
}

interface AnalyticsData {
  totalRequests: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  localeStats: LocaleStats[];
}

interface RawAnalyticsRow {
  locale: string;
  response_time_ms: number | null;
  cached: boolean;
}

interface RawErrorRow {
  locale: string;
}

export function LocalizationMonitoring() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch analytics for last 24 hours
        const { data: analytics, error: analyticsError } = await supabase.rpc(
          "get_localization_analytics",
          { time_window: "24 hours" }
        );

        if (analyticsError) {
          // Fallback to direct query if RPC doesn't exist
          const { data: rawData, error: queryError } = await supabase
            .from("translation_analytics")
            .select("*")
            .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          if (queryError) throw queryError;

          // Process raw data
          const localeMap = new Map<string, LocaleStats>();
          let totalRequests = 0;
          let totalResponseTime = 0;
          let cachedRequests = 0;

          (rawData as RawAnalyticsRow[] | null)?.forEach((row) => {
            totalRequests++;
            totalResponseTime += row.response_time_ms || 0;
            if (row.cached) cachedRequests++;

            const locale = row.locale;
            if (!localeMap.has(locale)) {
              localeMap.set(locale, {
                locale,
                requests: 0,
                avgResponseTime: 0,
                cacheHitRate: 0,
                errors: 0,
              });
            }

            const stats = localeMap.get(locale)!;
            stats.requests++;
            stats.avgResponseTime += row.response_time_ms || 0;
            if (row.cached) stats.cacheHitRate++;
          });

          // Calculate averages
          const localeStats = Array.from(localeMap.values()).map((stats) => ({
            ...stats,
            avgResponseTime: stats.requests > 0 ? stats.avgResponseTime / stats.requests : 0,
            cacheHitRate: stats.requests > 0 ? (stats.cacheHitRate / stats.requests) * 100 : 0,
          }));

          // Fetch errors
          const { data: errors } = await supabase
            .from("translation_errors")
            .select("locale")
            .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          const errorMap = new Map<string, number>();
          (errors as RawErrorRow[] | null)?.forEach((err) => {
            errorMap.set(err.locale, (errorMap.get(err.locale) || 0) + 1);
          });

          localeStats.forEach((stats) => {
            stats.errors = errorMap.get(stats.locale) || 0;
          });

          const totalErrors = errors?.length || 0;

          setData({
            totalRequests,
            avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
            cacheHitRate: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
            errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
            localeStats: localeStats.sort((a, b) => b.requests - a.requests),
          });
        } else {
          setData(analytics);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch analytics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
        </svg>
        <div>
          <p className="font-bold text-red-900">Failed to load analytics</p>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
        </svg>
        <p className="text-blue-900">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold mb-2">Localization Monitoring</h2>
          <p className="text-gray-600">Last 24 hours</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Requests</p>
            <p className="text-3xl font-bold">{data.totalRequests.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
              Last 24 hours
            </p>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
            <p className="text-3xl font-bold">{data.avgResponseTime.toFixed(0)}ms</p>
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mt-2 ${
              data.avgResponseTime < 100
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {data.avgResponseTime < 100 ? "Good" : "Slow"}
            </span>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Cache Hit Rate</p>
            <p className="text-3xl font-bold">{data.cacheHitRate.toFixed(1)}%</p>
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mt-2 ${
              data.cacheHitRate > 80
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {data.cacheHitRate > 80 ? "Excellent" : "Needs Improvement"}
            </span>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Error Rate</p>
            <p className="text-3xl font-bold">{data.errorRate.toFixed(2)}%</p>
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded mt-2 ${
              data.errorRate < 1
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {data.errorRate < 1 ? "Healthy" : "Issues"}
            </span>
          </div>
        </div>

        {/* Locale Stats Table */}
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 overflow-x-auto">
          <h3 className="text-lg font-bold mb-4">Locale Performance</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Locale</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Requests</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Avg Response (ms)</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Cache Hit Rate</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Errors</th>
              </tr>
            </thead>
            <tbody>
              {data.localeStats.map((stats) => (
                <tr key={stats.locale} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-4">
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                      {stats.locale.toUpperCase()}
                    </span>
                  </td>
                  <td className="text-right py-2 px-4">{stats.requests.toLocaleString()}</td>
                  <td className={`text-right py-2 px-4 ${
                    stats.avgResponseTime < 100 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {stats.avgResponseTime.toFixed(0)}
                  </td>
                  <td className={`text-right py-2 px-4 ${
                    stats.cacheHitRate > 80 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {stats.cacheHitRate.toFixed(1)}%
                  </td>
                  <td className={`text-right py-2 px-4 ${
                    stats.errors > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {stats.errors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Health Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            data.cacheHitRate > 80
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <svg className={`w-5 h-5 mt-0.5 ${
              data.cacheHitRate > 80 ? 'text-green-500' : 'text-yellow-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div className="text-sm">
              <p className="font-bold">Cache Performance</p>
              <p className="text-gray-700">
                {data.cacheHitRate > 80
                  ? "Cache is performing well"
                  : "Consider optimizing cache strategy"}
              </p>
            </div>
          </div>

          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            data.avgResponseTime < 100
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <svg className={`w-5 h-5 mt-0.5 ${
              data.avgResponseTime < 100 ? 'text-green-500' : 'text-yellow-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div className="text-sm">
              <p className="font-bold">Response Time</p>
              <p className="text-gray-700">
                {data.avgResponseTime < 100
                  ? "Response times are healthy"
                  : "Response times need optimization"}
              </p>
            </div>
          </div>

          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            data.errorRate < 1
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <svg className={`w-5 h-5 mt-0.5 ${
              data.errorRate < 1 ? 'text-green-500' : 'text-red-500'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
            </svg>
            <div className="text-sm">
              <p className="font-bold">Error Rate</p>
              <p className="text-gray-700">
                {data.errorRate < 1 ? "Error rate is acceptable" : "High error rate detected"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
