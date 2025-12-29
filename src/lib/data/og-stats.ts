/**
 * OG Image Statistics (Enterprise-grade)
 *
 * Fetches dynamic stats for OpenGraph images with:
 * - 5-minute in-memory cache
 * - Stale-while-revalidate pattern
 * - Centralized fallback values
 */

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
