/**
 * Localization Data Layer
 * Server-side functions for fetching localization analytics
 */

import { createClient } from "@/lib/supabase/server";

export interface LocaleStats {
  locale: string;
  requests: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errors: number;
}

export interface LocalizationAnalytics {
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
  timestamp: string;
}

interface RawErrorRow {
  locale: string;
  timestamp: string;
}

/**
 * Get localization analytics for the last 24 hours
 */
export async function getLocalizationAnalytics(): Promise<LocalizationAnalytics | null> {
  const supabase = await createClient();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_localization_analytics",
      { time_window: "24 hours" }
    );

    if (!rpcError && rpcData) {
      return rpcData as LocalizationAnalytics;
    }

    // Fallback to direct query
    const { data: rawData, error: queryError } = await supabase
      .from("translation_analytics")
      .select("*")
      .gte("timestamp", last24h);

    if (queryError) {
      console.error("Error fetching localization analytics:", queryError);
      return null;
    }

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
      .gte("timestamp", last24h);

    const errorMap = new Map<string, number>();
    (errors as RawErrorRow[] | null)?.forEach((err) => {
      errorMap.set(err.locale, (errorMap.get(err.locale) || 0) + 1);
    });

    localeStats.forEach((stats) => {
      stats.errors = errorMap.get(stats.locale) || 0;
    });

    const totalErrors = errors?.length || 0;

    return {
      totalRequests,
      avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      cacheHitRate: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      localeStats: localeStats.sort((a, b) => b.requests - a.requests),
    };
  } catch (error) {
    console.error("Error in getLocalizationAnalytics:", error);
    return null;
  }
}
