'use server';

import { createClient } from '@/lib/supabase/server';

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

/**
 * Get localization analytics for admin dashboard
 * Fetches data for the last 24 hours
 */
export async function getLocalizationAnalytics(): Promise<{
  data: LocalizationAnalytics | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // Try RPC first
    const { data: analytics, error: analyticsError } = await supabase.rpc(
      'get_localization_analytics',
      {
        time_window: '24 hours',
      }
    );

    if (!analyticsError && analytics) {
      return { data: analytics, error: null };
    }

    // Fallback to direct query if RPC doesn't exist
    const timeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: rawData, error: queryError } = await supabase
      .from('translation_analytics')
      .select('*')
      .gte('timestamp', timeThreshold);

    if (queryError) {
      return { data: null, error: queryError.message };
    }

    // Process raw data
    const localeMap = new Map<string, LocaleStats>();
    let totalRequests = 0;
    let totalResponseTime = 0;
    let cachedRequests = 0;

    rawData?.forEach((row) => {
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
      .from('translation_errors')
      .select('locale')
      .gte('timestamp', timeThreshold);

    const errorMap = new Map<string, number>();
    errors?.forEach((err) => {
      errorMap.set(err.locale, (errorMap.get(err.locale) || 0) + 1);
    });

    localeStats.forEach((stats) => {
      stats.errors = errorMap.get(stats.locale) || 0;
    });

    const result: LocalizationAnalytics = {
      totalRequests,
      avgResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      cacheHitRate: totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0,
      errorRate: totalRequests > 0 ? ((errors?.length || 0) / totalRequests) * 100 : 0,
      localeStats: localeStats.sort((a, b) => b.requests - a.requests),
    };

    return { data: result, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch analytics',
    };
  }
}
