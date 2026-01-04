/**
 * OG Image Statistics (Enterprise-grade)
 *
 * Fetches dynamic stats for OpenGraph images with:
 * - 5-minute in-memory cache
 * - Stale-while-revalidate pattern
 * - Centralized fallback values
 * - Sentry error tracking
 */

import * as Sentry from "@sentry/nextjs";
import { createEdgeClient } from "@/lib/supabase/edge";

export interface OGStats {
  totalListings: number;
  activeUsers: number;
  foodSaved: string;
}

/**
 * Fallback stats when database is unavailable
 * Single source of truth - not duplicated elsewhere
 */
const FALLBACK_STATS: OGStats = {
  totalListings: 100,
  activeUsers: 50,
  foodSaved: "200 kg",
};

// In-memory cache for edge runtime
let cachedStats: OGStats | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate estimated food saved based on listings
 * Assumes average of 2kg per food listing
 */
function calculateFoodSaved(listingsCount: number): string {
  const kgSaved = listingsCount * 2;
  if (kgSaved >= 1000) {
    return `${(kgSaved / 1000).toFixed(1)} tons`;
  }
  return `${kgSaved} kg`;
}

/**
 * Get stats for OG images
 *
 * Features:
 * - Returns cached data if fresh (< 5 min old)
 * - On error, returns stale cache or fallback
 * - Never throws - always returns valid stats
 */
export async function getOGStats(): Promise<OGStats> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedStats && now - cacheTimestamp < CACHE_TTL) {
    return cachedStats;
  }

  try {
    const supabase = createEdgeClient();

    // Parallel queries for performance
    const [listingsResult, usersResult] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const totalListings = listingsResult.count || 0;
    const activeUsers = usersResult.count || 0;

    const stats: OGStats = {
      totalListings,
      activeUsers,
      foodSaved: calculateFoodSaved(totalListings),
    };

    // Update cache
    cachedStats = stats;
    cacheTimestamp = now;

    return stats;
  } catch (error) {
    // Report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        component: "og-image",
        function: "getOGStats",
      },
      extra: {
        hasCachedStats: !!cachedStats,
        cacheAge: cachedStats ? now - cacheTimestamp : null,
      },
    });
    console.error("[OG Stats] Error fetching stats:", error);
    // Return stale cache if available, otherwise fallback
    return cachedStats || FALLBACK_STATS;
  }
}

/**
 * Get seasonal theme based on current date
 */
export function getSeasonalTheme(): {
  season: "winter" | "spring" | "summer" | "fall";
  accent: string;
  emoji: string;
} {
  const month = new Date().getMonth();

  if (month >= 11 || month <= 1) {
    return { season: "winter", accent: "#A5D8FF", emoji: "❄️" };
  } else if (month >= 2 && month <= 4) {
    return { season: "spring", accent: "#B2F2BB", emoji: "🌸" };
  } else if (month >= 5 && month <= 7) {
    return { season: "summer", accent: "#FFE066", emoji: "☀️" };
  } else {
    return { season: "fall", accent: "#FFBD7A", emoji: "🍂" };
  }
}

export interface AppRatingStats {
  ratingValue: string;
  ratingCount: string;
}

// Fallback ratings when data unavailable
const FALLBACK_RATING: AppRatingStats = {
  ratingValue: "4.8",
  ratingCount: "100",
};

// Cache for app rating stats
let cachedRating: AppRatingStats | null = null;
let ratingCacheTimestamp = 0;
const RATING_CACHE_TTL = 60 * 60 * 1000; // 1 hour (ratings change less frequently)

/**
 * Get aggregate app rating stats for SoftwareApplication schema
 * Aggregates from user reviews/ratings in the database
 */
export async function getAppRatingStats(): Promise<AppRatingStats> {
  const now = Date.now();

  // Return cached if fresh
  if (cachedRating && now - ratingCacheTimestamp < RATING_CACHE_TTL) {
    return cachedRating;
  }

  try {
    const supabase = createEdgeClient();

    // Aggregate ratings from reviews table
    const { data, error } = await supabase.from("reviews").select("rating");

    if (error || !data || data.length === 0) {
      return cachedRating || FALLBACK_RATING;
    }

    const validRatings = data.filter((r) => r.rating != null && r.rating > 0);
    if (validRatings.length === 0) {
      return cachedRating || FALLBACK_RATING;
    }

    const totalRatings = validRatings.length;
    const avgRating = validRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings;

    const stats: AppRatingStats = {
      ratingValue: avgRating.toFixed(1),
      ratingCount: totalRatings.toString(),
    };

    // Update cache
    cachedRating = stats;
    ratingCacheTimestamp = now;

    return stats;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: "jsonld",
        function: "getAppRatingStats",
      },
    });
    console.error("[App Rating] Error fetching stats:", error);
    return cachedRating || FALLBACK_RATING;
  }
}
