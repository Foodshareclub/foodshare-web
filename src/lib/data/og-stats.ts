/**
 * OG Image Statistics
 * Fetches dynamic stats for OpenGraph images
 */

import { createClient } from "@/lib/supabase/server";

export interface OGStats {
  totalListings: number;
  activeUsers: number;
  foodSaved: string;
}

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
 * Uses edge-compatible queries with caching
 */
export async function getOGStats(): Promise<OGStats> {
  try {
    const supabase = await createClient();

    // Parallel queries for performance
    const [listingsResult, usersResult] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const totalListings = listingsResult.count || 0;
    const activeUsers = usersResult.count || 0;

    return {
      totalListings,
      activeUsers,
      foodSaved: calculateFoodSaved(totalListings),
    };
  } catch (error) {
    console.error("[OG Stats] Error fetching stats:", error);
    // Return fallback values
    return {
      totalListings: 100,
      activeUsers: 50,
      foodSaved: "200 kg",
    };
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
