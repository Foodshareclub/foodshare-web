/**
 * Admin Reports Data Layer
 * Fetches analytics and reporting data for admin dashboard
 *
 * Best Practices Applied:
 * - Explicit return types with readonly modifiers
 * - Const assertions for immutable data structures
 * - Parallel data fetching with Promise.all
 * - Type-safe Supabase queries
 * - Pure utility functions extracted
 * - Discriminated unions for type safety
 *
 * The cookies() call makes these functions automatically dynamic.
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types - Readonly for immutability
// ============================================================================

interface OverviewMetrics {
  readonly totalListings: number;
  readonly totalUsers: number;
  readonly totalChats: number;
  readonly totalArranged: number;
  readonly listingsGrowth: number;
  readonly usersGrowth: number;
  readonly chatsGrowth: number;
  readonly arrangedGrowth: number;
}

interface CategoryCount {
  readonly category: string;
  readonly count: number;
}

interface DailyCount {
  readonly date: string;
  readonly count: number;
}

interface TopUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly listingsCount: number;
}

interface ActivityItem {
  readonly type: string;
  readonly description: string;
  readonly timestamp: string;
}

export interface ReportsData {
  readonly overview: OverviewMetrics;
  readonly listingsByCategory: readonly CategoryCount[];
  readonly listingsByDay: readonly DailyCount[];
  readonly usersByDay: readonly DailyCount[];
  readonly topUsers: readonly TopUser[];
  readonly recentActivity: readonly ActivityItem[];
}

// ============================================================================
// Constants
// ============================================================================

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CATEGORIES = 8;

// ============================================================================
// Pure Utility Functions
// ============================================================================

/**
 * Calculate growth percentage between two periods
 * Returns 100 if previous is 0 and current > 0, otherwise percentage change
 */
function calculateGrowth(current: number | null, previous: number | null): number {
  const curr = current ?? 0;
  const prev = previous ?? 0;

  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Aggregate items by category, returning sorted top N
 */
function aggregateByCategory(
  items: readonly { post_type: string | null }[] | null,
  limit: number = MAX_CATEGORIES
): readonly CategoryCount[] {
  const categoryMap = new Map<string, number>();

  for (const item of items ?? []) {
    const category = item.post_type ?? "other";
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
  }

  return Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }) as const)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Aggregate timestamped items by day
 */
function aggregateByDay(
  items: readonly { created_at?: string; created_time?: string }[] | null
): readonly DailyCount[] {
  const dayMap = new Map<string, number>();

  for (const item of items ?? []) {
    const timestamp = item.created_at ?? item.created_time;
    if (!timestamp) continue;

    const dayKey = timestamp.split("T")[0];
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }

  return Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }) as const)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// Main Data Function
// ============================================================================

/**
 * Fetch comprehensive reports data for admin dashboard
 * Uses optimized RPC for counts + parallel queries for aggregations
 */
export async function getReportsData(): Promise<ReportsData> {
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - DAYS_30_MS);

  // Execute RPC + aggregation queries in parallel
  const [
    // Single RPC replaces 12 count queries
    { data: statsData, error: statsError },
    // Aggregation data (still need separate queries)
    { data: categoryData },
    { data: recentListings },
    { data: recentUsers },
  ] = await Promise.all([
    // Optimized RPC for all counts
    supabase.rpc("get_admin_reports_stats", { p_days_window: 30 }),

    // Category breakdown
    supabase.from("posts").select("post_type"),

    // Recent listings for daily chart
    supabase
      .from("posts")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),

    // Recent users for daily chart
    supabase
      .from("profiles")
      .select("created_time")
      .gte("created_time", thirtyDaysAgo.toISOString())
      .order("created_time", { ascending: true }),
  ]);

  // Extract stats from RPC result
  const stats = statsData?.[0];
  if (statsError || !stats) {
    console.error("Error fetching admin reports stats:", statsError);
  }

  // Build response with computed aggregations
  return {
    overview: {
      totalListings: Number(stats?.total_listings) || 0,
      totalUsers: Number(stats?.total_users) || 0,
      totalChats: Number(stats?.total_chats) || 0,
      totalArranged: Number(stats?.total_arranged) || 0,
      listingsGrowth: calculateGrowth(
        Number(stats?.listings_last_period) || 0,
        Number(stats?.listings_prev_period) || 0
      ),
      usersGrowth: calculateGrowth(
        Number(stats?.users_last_period) || 0,
        Number(stats?.users_prev_period) || 0
      ),
      chatsGrowth: calculateGrowth(
        Number(stats?.chats_last_period) || 0,
        Number(stats?.chats_prev_period) || 0
      ),
      arrangedGrowth: calculateGrowth(
        Number(stats?.arranged_last_period) || 0,
        Number(stats?.arranged_prev_period) || 0
      ),
    },
    listingsByCategory: aggregateByCategory(categoryData),
    listingsByDay: aggregateByDay(recentListings),
    usersByDay: aggregateByDay(recentUsers?.map((u) => ({ created_at: u.created_time })) ?? null),
    topUsers: [], // TODO: Implement with proper query
    recentActivity: [], // TODO: Implement with audit log
  } as const;
}

// ============================================================================
// Cached Version
// ============================================================================

/**
 * Get cached reports data
 * NOTE: getReportsData uses createClient() (cookies-dependent), so this
 */
export const getCachedReportsData = getReportsData;
