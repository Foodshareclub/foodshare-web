/**
 * Admin Reports Data Layer
 * Fetches analytics and reporting data for admin dashboard
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient } from "@/lib/supabase/server";

export interface ReportsData {
  overview: {
    totalListings: number;
    totalUsers: number;
    totalChats: number;
    totalArranged: number;
    listingsGrowth: number;
    usersGrowth: number;
    chatsGrowth: number;
    arrangedGrowth: number;
  };
  listingsByCategory: { category: string; count: number }[];
  listingsByDay: { date: string; count: number }[];
  usersByDay: { date: string; count: number }[];
  topUsers: { id: string; name: string; email: string; listingsCount: number }[];
  recentActivity: { type: string; description: string; timestamp: string }[];
}

export async function getReportsData(): Promise<ReportsData> {
  const supabase = await createClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch all counts in parallel
  const [
    { count: totalListings },
    { count: totalUsers },
    { count: totalChats },
    { count: totalArranged },
    { count: listingsLast30 },
    { count: listingsPrev30 },
    { count: usersLast30 },
    { count: usersPrev30 },
    { count: chatsLast30 },
    { count: chatsPrev30 },
    { count: arrangedLast30 },
    { count: arrangedPrev30 },
    { data: categoryData },
    { data: recentListings },
    { data: recentUsers },
  ] = await Promise.all([
    // Totals
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("rooms").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("post_arranged", true),

    // Last 30 days
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_time", thirtyDaysAgo.toISOString()),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_time", sixtyDaysAgo.toISOString())
      .lt("created_time", thirtyDaysAgo.toISOString()),
    supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("post_arranged", true)
      .gte("post_arranged_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("post_arranged", true)
      .gte("post_arranged_at", sixtyDaysAgo.toISOString())
      .lt("post_arranged_at", thirtyDaysAgo.toISOString()),

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

  // Calculate growth percentages
  const calcGrowth = (current: number | null, previous: number | null) => {
    const curr = current ?? 0;
    const prev = previous ?? 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Aggregate categories
  const categoryMap = new Map<string, number>();
  (categoryData ?? []).forEach((item) => {
    const cat = item.post_type || "other";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  });
  const listingsByCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Aggregate by day
  const aggregateByDay = (items: { created_at?: string; created_time?: string }[] | null) => {
    const dayMap = new Map<string, number>();
    (items ?? []).forEach((item) => {
      const date = new Date(item.created_at || item.created_time || "");
      const dayKey = date.toISOString().split("T")[0];
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    });
    return Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const listingsByDay = aggregateByDay(recentListings);
  const usersByDay = aggregateByDay(
    recentUsers?.map((u) => ({ created_at: u.created_time })) ?? null
  );

  return {
    overview: {
      totalListings: totalListings ?? 0,
      totalUsers: totalUsers ?? 0,
      totalChats: totalChats ?? 0,
      totalArranged: totalArranged ?? 0,
      listingsGrowth: calcGrowth(listingsLast30, listingsPrev30),
      usersGrowth: calcGrowth(usersLast30, usersPrev30),
      chatsGrowth: calcGrowth(chatsLast30, chatsPrev30),
      arrangedGrowth: calcGrowth(arrangedLast30, arrangedPrev30),
    },
    listingsByCategory,
    listingsByDay,
    usersByDay,
    topUsers: [],
    recentActivity: [],
  };
}

/**
 * Get cached reports data
 * Note: Cannot use unstable_cache directly with createClient() as it uses cookies()
 * This is a wrapper that can be used when caching is safe
 */
export const getCachedReportsData = unstable_cache(
  async (): Promise<ReportsData> => {
    return getReportsData();
  },
  ["admin-reports"],
  {
    revalidate: CACHE_DURATIONS.ADMIN_STATS,
    tags: [CACHE_TAGS.ADMIN_REPORTS, CACHE_TAGS.ADMIN],
  }
);
