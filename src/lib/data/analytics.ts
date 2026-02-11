/**
 * Analytics Data Layer
 *
 * Cached data fetching functions for analytics.
 * Moved from server actions to follow the architecture rule:
 * Server Actions handle WRITES; data layer handles READS.
 */

import { createClient } from "@/lib/supabase/server";
import { serverActionError, serverActionSuccess } from "@/lib/errors";
import type { ServerActionResult } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  activeUsers7d: number;
  totalListings: number;
  activeListings: number;
  arrangedListings: number;
  listingsChange: number;
  usersChange: number;
  activeUsersChange: number;
  arrangedChange: number;
  foodSavedKg: number;
  // Engagement metrics
  totalConversations: number;
  totalViews: number;
  totalLikes: number;
  usersWithPosts: number;
  newUsersThisMonth: number;
  newListingsThisMonth: number;
}

export interface MonthlyGrowth {
  month: string;
  users: number;
  listings: number;
}

export interface DailyActiveUsers {
  date: string;
  count: number;
}

export interface EventDistribution {
  name: string;
  value: number;
  [key: string]: unknown;
}

export interface FunnelStep {
  step: string;
  count: number;
  dropoff: number;
}

export interface RetentionCohort {
  cohort: string; // "2024-01"
  size: number;
  month1: number; // Percentage or count returning in month 1
  month2: number;
}

export interface InventoryAge {
  bucket: string;
  count: number;
}

export interface ListingTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface TopSharer {
  userId: string;
  nickname: string;
  arrangedCount: number;
  totalListings: number;
}

export interface SyncStatus {
  tableName: string;
  lastSyncAt: string | null;
  recordsSynced: number;
  syncMode: string;
}

export interface GeoHotspot {
  latitude: number;
  longitude: number;
  count: number;
  arrangedCount: number;
  postType: string;
}

export interface HourlyActivity {
  hour: number;
  listingCount: number;
  eventCount: number;
}

// ============================================================================
// Read Functions
// ============================================================================

export async function getAnalyticsSummary(): Promise<ServerActionResult<AnalyticsSummary>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // Query Supabase directly (MotherDuck doesn't work in Vercel)
    // Note: profiles uses created_time, last_seen_at; posts uses is_active, is_arranged
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get active users (last_seen_at in last 30 days)
    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", thirtyDaysAgo.toISOString());

    // Get active users in last 7 days
    const { count: activeUsers7d } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", sevenDaysAgo.toISOString());

    // Get total listings
    const { count: totalListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    // Get active listings (is_active=true and is_arranged=false)
    const { count: activeListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_arranged", false);

    // Get arranged listings
    const { count: arrangedListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("is_arranged", true);

    // Get users created this month vs last month (profiles uses created_time)
    const { count: usersThisMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_time", thirtyDaysAgo.toISOString());

    const { count: usersLastMonth } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_time", sixtyDaysAgo.toISOString())
      .lt("created_time", thirtyDaysAgo.toISOString());

    // Get listings created this month vs last month
    const { count: listingsThisMonth } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { count: listingsLastMonth } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString())
      .lt("created_at", thirtyDaysAgo.toISOString());

    // Engagement metrics
    const { count: totalConversations } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true });

    const { count: usersWithPosts } = await supabase
      .from("posts")
      .select("profile_id", { count: "exact", head: true })
      .not("profile_id", "is", null);

    // Get aggregate stats (views and likes)
    const { data: statsData } = await supabase
      .from("posts")
      .select("post_views, post_like_counter");

    const totalViews = statsData?.reduce((sum, p) => sum + (p.post_views || 0), 0) || 0;
    const totalLikes = statsData?.reduce((sum, p) => sum + (p.post_like_counter || 0), 0) || 0;

    // Calculate percentage changes
    const usersChange =
      usersLastMonth && usersLastMonth > 0
        ? (((usersThisMonth || 0) - usersLastMonth) / usersLastMonth) * 100
        : 0;

    const listingsChange =
      listingsLastMonth && listingsLastMonth > 0
        ? (((listingsThisMonth || 0) - listingsLastMonth) / listingsLastMonth) * 100
        : 0;

    // Estimate food saved: ~2kg average per arranged listing
    const foodSavedKg = (arrangedListings || 0) * 2;

    return serverActionSuccess({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      activeUsers7d: activeUsers7d || 0,
      totalListings: totalListings || 0,
      activeListings: activeListings || 0,
      arrangedListings: arrangedListings || 0,
      listingsChange: Math.round(listingsChange * 10) / 10,
      usersChange: Math.round(usersChange * 10) / 10,
      activeUsersChange: 0,
      arrangedChange: 0,
      foodSavedKg,
      totalConversations: totalConversations || 0,
      totalViews,
      totalLikes,
      usersWithPosts: usersWithPosts || 0,
      newUsersThisMonth: usersThisMonth || 0,
      newListingsThisMonth: listingsThisMonth || 0,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return serverActionSuccess({
      totalUsers: 0,
      activeUsers: 0,
      activeUsers7d: 0,
      totalListings: 0,
      activeListings: 0,
      arrangedListings: 0,
      listingsChange: 0,
      usersChange: 0,
      activeUsersChange: 0,
      arrangedChange: 0,
      foodSavedKg: 0,
      totalConversations: 0,
      totalViews: 0,
      totalLikes: 0,
      usersWithPosts: 0,
      newUsersThisMonth: 0,
      newListingsThisMonth: 0,
    });
  }
}

export async function getMonthlyGrowth(): Promise<ServerActionResult<MonthlyGrowth[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // Query Supabase directly for last 12 months
    // Note: profiles uses created_time, posts uses created_at
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: users } = await supabase
      .from("profiles")
      .select("created_time")
      .gte("created_time", twelveMonthsAgo.toISOString());

    const { data: listings } = await supabase
      .from("posts")
      .select("created_at")
      .gte("created_at", twelveMonthsAgo.toISOString());

    // Aggregate by month
    const monthlyData: Record<string, { users: number; listings: number }> = {};

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleString("en-US", { month: "short" });
      monthlyData[monthKey] = { users: 0, listings: 0 };
    }

    users?.forEach((u) => {
      if (u.created_time) {
        const date = new Date(u.created_time);
        const monthKey = date.toLocaleString("en-US", { month: "short" });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].users++;
        }
      }
    });

    listings?.forEach((l) => {
      if (l.created_at) {
        const date = new Date(l.created_at);
        const monthKey = date.toLocaleString("en-US", { month: "short" });
        if (monthlyData[monthKey]) {
          monthlyData[monthKey].listings++;
        }
      }
    });

    const results = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      users: data.users,
      listings: data.listings,
    }));

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch growth data:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Daily Active Users (DAU) for the last 30 days
 */
export async function getDailyActiveUsers(): Promise<ServerActionResult<DailyActiveUsers[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly for last 30 days (use last_seen_at for activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: users } = await supabase
      .from("profiles")
      .select("last_seen_at")
      .gte("last_seen_at", thirtyDaysAgo.toISOString());

    // Aggregate by day
    const dailyData: Record<string, number> = {};

    users?.forEach((u) => {
      if (u.last_seen_at) {
        const date = u.last_seen_at.substring(0, 10);
        dailyData[date] = (dailyData[date] || 0) + 1;
      }
    });

    const results = Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch DAU:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get distribution of event types (Top Actions)
 */
export async function getEventDistribution(): Promise<ServerActionResult<EventDistribution[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Return mock data since we don't have an events table in Supabase
    // In production, you'd track events in a dedicated table
    return serverActionSuccess([
      { name: "Page View", value: 1250 },
      { name: "Listing Created", value: 340 },
      { name: "Food Requested", value: 180 },
      { name: "Food Arranged", value: 95 },
      { name: "Message Sent", value: 420 },
    ]);
  } catch (error) {
    console.error("Failed to fetch event distribution:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Conversion Funnel Data
 */
export async function getConversionFunnel(): Promise<ServerActionResult<FunnelStep[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly
    const { count: totalListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    // Get listings that have been requested (have rooms)
    const { count: requestedListings } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true });

    // Get arranged listings (use is_arranged column)
    const { count: arrangedListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("is_arranged", true);

    const listings = totalListings || 0;
    const requests = requestedListings || 0;
    const arranged = arrangedListings || 0;

    return serverActionSuccess([
      { step: "Listings", count: listings, dropoff: 0 },
      { step: "Requests", count: requests, dropoff: listings > 0 ? 1 - requests / listings : 0 },
      { step: "Arranged", count: arranged, dropoff: requests > 0 ? 1 - arranged / requests : 0 },
    ]);
  } catch (error) {
    console.error("Failed to fetch funnel:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get User Retention Cohorts
 * Groups users by signup month and checks for subsequent activity
 */
export async function getUserRetentionCohorts(): Promise<ServerActionResult<RetentionCohort[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly (profiles uses created_time, last_seen_at)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: users } = await supabase
      .from("profiles")
      .select("id, created_time, last_seen_at")
      .gte("created_time", sixMonthsAgo.toISOString());

    // Group by cohort month
    const cohorts: Record<string, { size: number; month1: number; month2: number }> = {};

    users?.forEach((u) => {
      if (!u.created_time) return;
      const cohort = u.created_time.substring(0, 7);

      if (!cohorts[cohort]) cohorts[cohort] = { size: 0, month1: 0, month2: 0 };
      cohorts[cohort].size++;

      // Check if user was active in month 1 and month 2
      if (u.last_seen_at && u.created_time) {
        const created = new Date(u.created_time);
        const lastSeen = new Date(u.last_seen_at);
        const monthsDiff =
          (lastSeen.getFullYear() - created.getFullYear()) * 12 +
          (lastSeen.getMonth() - created.getMonth());

        if (monthsDiff >= 1) cohorts[cohort].month1++;
        if (monthsDiff >= 2) cohorts[cohort].month2++;
      }
    });

    const results = Object.entries(cohorts)
      .map(([cohort, data]) => ({ cohort, ...data }))
      .sort((a, b) => b.cohort.localeCompare(a.cohort))
      .slice(0, 6);

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch cohorts:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Inventory Aging
 * Buckets active listings by age
 */
export async function getInventoryAging(): Promise<ServerActionResult<InventoryAge[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly (use is_active, is_arranged columns)
    const { data: listings } = await supabase
      .from("posts")
      .select("created_at")
      .eq("is_active", true)
      .eq("is_arranged", false);

    const now = Date.now();
    const buckets = { "0-7 days": 0, "7-30 days": 0, "30+ days": 0 };

    listings?.forEach((l) => {
      if (!l.created_at) return;
      const daysDiff = Math.floor((now - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 7) buckets["0-7 days"]++;
      else if (daysDiff < 30) buckets["7-30 days"]++;
      else buckets["30+ days"]++;
    });

    return serverActionSuccess([
      { bucket: "0-7 days", count: buckets["0-7 days"] },
      { bucket: "7-30 days", count: buckets["7-30 days"] },
      { bucket: "30+ days", count: buckets["30+ days"] },
    ]);
  } catch (error) {
    console.error("Failed to fetch inventory aging:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Listing Type Distribution
 * Shows breakdown of listings by post_type (food, thing, borrow, etc.)
 */
export async function getListingTypeDistribution(): Promise<
  ServerActionResult<ListingTypeDistribution[]>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly (use is_active column)
    const { data: listings } = await supabase
      .from("posts")
      .select("post_type")
      .eq("is_active", true);

    const typeCounts: Record<string, number> = {};
    let total = 0;

    listings?.forEach((l) => {
      const type = l.post_type || "unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      total++;
    });

    const results = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch listing type distribution:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Top Sharers
 * Users with most arranged (successful) listings
 */
export async function getTopSharers(limit: number = 10): Promise<ServerActionResult<TopSharer[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly - get listings with profile info (use is_arranged column)
    const { data: listings } = await supabase
      .from("posts")
      .select("profile_id, is_arranged, profiles(nickname)")
      .not("profile_id", "is", null);

    // Aggregate by user
    const userStats: Record<
      string,
      { nickname: string; totalListings: number; arrangedCount: number }
    > = {};

    listings?.forEach((l) => {
      const userId = l.profile_id;
      if (!userId) return;

      if (!userStats[userId]) {
        userStats[userId] = {
          nickname: (l.profiles as { nickname?: string } | null)?.nickname || "Anonymous",
          totalListings: 0,
          arrangedCount: 0,
        };
      }

      userStats[userId].totalListings++;
      if (l.is_arranged) userStats[userId].arrangedCount++;
    });

    const results = Object.entries(userStats)
      .map(([userId, data]) => ({ userId, ...data }))
      .filter((u) => u.arrangedCount > 0)
      .sort((a, b) => b.arrangedCount - a.arrangedCount)
      .slice(0, limit);

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch top sharers:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Sync Status
 * Returns metadata about the data source
 */
export async function getSyncStatus(): Promise<ServerActionResult<SyncStatus[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Return info about Supabase tables since we're querying directly
    const { count: profileCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: postCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    const { count: roomCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true });

    return serverActionSuccess([
      {
        tableName: "profiles",
        lastSyncAt: new Date().toISOString(),
        recordsSynced: profileCount || 0,
        syncMode: "direct",
      },
      {
        tableName: "posts",
        lastSyncAt: new Date().toISOString(),
        recordsSynced: postCount || 0,
        syncMode: "direct",
      },
      {
        tableName: "rooms",
        lastSyncAt: new Date().toISOString(),
        recordsSynced: roomCount || 0,
        syncMode: "direct",
      },
    ]);
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Geographic Hotspots
 * Returns aggregated listing data by location for heat map visualization
 */
export async function getGeographicHotspots(): Promise<ServerActionResult<GeoHotspot[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly (use location_json for coordinates, is_active/is_arranged columns)
    const { data: listings } = await supabase
      .from("posts")
      .select("location_json, is_arranged, post_type")
      .eq("is_active", true)
      .not("location_json", "is", null);

    // Grid-based aggregation - round coordinates to ~1km precision
    const grid: Record<
      string,
      { count: number; arrangedCount: number; types: Record<string, number> }
    > = {};

    listings?.forEach((l) => {
      // location_json is GeoJSON: { type: "Point", coordinates: [lng, lat] }
      const locationJson = l.location_json as {
        type: string;
        coordinates: [number, number];
      } | null;
      if (!locationJson?.coordinates) return;

      const [lng, lat] = locationJson.coordinates;
      if (lat == null || lng == null) return;

      const roundedLat = Math.round(lat * 100) / 100;
      const roundedLng = Math.round(lng * 100) / 100;
      const key = `${roundedLat},${roundedLng}`;

      if (!grid[key]) {
        grid[key] = { count: 0, arrangedCount: 0, types: {} };
      }

      grid[key].count++;
      if (l.is_arranged) grid[key].arrangedCount++;

      const type = l.post_type || "unknown";
      grid[key].types[type] = (grid[key].types[type] || 0) + 1;
    });

    const results = Object.entries(grid)
      .map(([key, data]) => {
        const [lat, lng] = key.split(",").map(Number);
        // Find most common type
        const postType = Object.entries(data.types).sort((a, b) => b[1] - a[1])[0]?.[0] || "food";
        return {
          latitude: lat,
          longitude: lng,
          count: data.count,
          arrangedCount: data.arrangedCount,
          postType,
        };
      })
      .filter((h) => h.count >= 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 500);

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch geographic hotspots:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Activity by Hour
 * Returns listing and event activity grouped by hour of day
 */
export async function getActivityByHour(): Promise<ServerActionResult<HourlyActivity[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query Supabase directly
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: listings } = await supabase
      .from("posts")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Aggregate by hour
    const hourlyData: Record<number, { listingCount: number; eventCount: number }> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { listingCount: 0, eventCount: 0 };
    }

    listings?.forEach((l) => {
      if (l.created_at) {
        const hour = new Date(l.created_at).getHours();
        hourlyData[hour].listingCount++;
      }
    });

    const results = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        listingCount: data.listingCount,
        eventCount: data.eventCount,
      }))
      .sort((a, b) => a.hour - b.hour);

    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch hourly activity:", error);
    return serverActionSuccess([]);
  }
}
