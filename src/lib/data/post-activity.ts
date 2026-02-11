/**
 * Post Activity Data Functions
 *
 * Server-side data fetching for post activity logs.
 * Uses 'use cache' directive for server-side caching with tag-based invalidation.
 *
 * @module lib/data/post-activity
 */

import { cacheLife, cacheTag } from "next/cache";
import { createClient, createCachedClient } from "@/lib/supabase/server";
import { CACHE_TAGS, logCacheOperation } from "@/lib/data/cache-keys";
import type {
  PostActivityLog,
  PostActivityTimelineItem,
  UserActivitySummary,
  PostActivityDailyStats,
  PostActivityType,
} from "@/types/post-activity.types";

// ============================================================================
// Get Post Activity Timeline (Cached)
// ============================================================================

/**
 * Get activity timeline for a specific post
 * Uses 'use cache' for request deduplication and caching
 */
export async function getPostActivityTimeline(
  postId: number,
  options: {
    limit?: number;
    offset?: number;
    activityTypes?: PostActivityType[];
  } = {}
): Promise<PostActivityTimelineItem[]> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_LOGS(postId));

  const { limit = 50, offset = 0, activityTypes } = options;
  const cacheKey = `timeline-${postId}-${limit}-${offset}-${activityTypes?.join(",") || "all"}`;

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  const { data, error } = await supabase.rpc("get_post_activity_timeline", {
    p_post_id: postId,
    p_limit: limit,
    p_offset: offset,
    p_activity_types: activityTypes || null,
  });

  if (error) {
    console.error("[getPostActivityTimeline] Error:", error.message);
    return [];
  }

  logCacheOperation("set", cacheKey, { count: data?.length || 0 });
  return (data || []) as PostActivityTimelineItem[];
}

// ============================================================================
// Get Recent Post Activities (Cached)
// ============================================================================

/**
 * Get recent activities for a post (raw logs)
 * Uses 'use cache' for request deduplication
 */
export async function getRecentPostActivities(
  postId: number,
  limit: number = 20
): Promise<PostActivityLog[]> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_LOGS(postId));

  const cacheKey = `recent-${postId}-${limit}`;

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("post_activity_logs")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentPostActivities] Error:", error.message);
    return [];
  }

  logCacheOperation("set", cacheKey, { count: data?.length || 0 });
  return (data || []) as PostActivityLog[];
}

// ============================================================================
// Get User Activity Summary (Cached)
// ============================================================================

/**
 * Get activity summary for a user
 * Uses 'use cache' with user-specific tags
 */
export async function getUserActivitySummary(
  userId: string,
  days: number = 30
): Promise<UserActivitySummary[]> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.USER_ACTIVITY(userId));

  const cacheKey = `user-summary-${userId}-${days}`;

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  const { data, error } = await supabase.rpc("get_user_post_activity_summary", {
    p_user_id: userId,
    p_days: days,
  });

  if (error) {
    console.error("[getUserActivitySummary] Error:", error.message);
    return [];
  }

  logCacheOperation("set", cacheKey, { count: data?.length || 0 });
  return (data || []) as UserActivitySummary[];
}

// ============================================================================
// Get Post Activity Counts (Cached)
// ============================================================================

/**
 * Get activity counts by type for a post
 * Uses optimized RPC for single-query aggregation
 */
export async function getPostActivityCounts(
  postId: number
): Promise<Partial<Record<PostActivityType, number>>> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_LOGS(postId));

  const cacheKey = `counts-${postId}`;

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  // Use optimized RPC (replaces JS loop aggregation)
  const { data, error } = await supabase.rpc("get_post_activity_counts", {
    p_post_id: postId,
  });

  if (error) {
    console.error("[getPostActivityCounts] Error:", error.message);
    return {};
  }

  // Transform RPC result to counts object
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.activity_type] = Number(row.count) || 0;
  }

  logCacheOperation("set", cacheKey, { types: Object.keys(counts).length });
  return counts as Partial<Record<PostActivityType, number>>;
}

// ============================================================================
// Get Daily Activity Stats (Cached)
// ============================================================================

/**
 * Get daily activity statistics
 * Uses 'use cache' for dashboard performance
 */
export async function getDailyActivityStats(
  options: {
    startDate?: string;
    endDate?: string;
    postType?: string;
    limit?: number;
  } = {}
): Promise<PostActivityDailyStats[]> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_STATS);

  const { startDate, endDate, postType, limit = 30 } = options;
  const cacheKey = `daily-stats-${startDate || "none"}-${endDate || "none"}-${postType || "all"}-${limit}`;

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  let query = supabase
    .from("post_activity_daily_stats")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte("date", startDate);
  }
  if (endDate) {
    query = query.lte("date", endDate);
  }
  if (postType) {
    query = query.eq("post_type", postType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getDailyActivityStats] Error:", error.message);
    return [];
  }

  logCacheOperation("set", cacheKey, { count: data?.length || 0 });
  return (data || []) as PostActivityDailyStats[];
}

// ============================================================================
// Get Activity Logs with Filters
// ============================================================================

/**
 * Get activity logs with advanced filtering (for admin)
 * NOTE: Uses createClient() (cookies-dependent) - NOT cached
 */
export async function getActivityLogs(
  options: {
    postId?: number;
    actorId?: string;
    activityTypes?: PostActivityType[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PostActivityLog[]> {
  const { postId, actorId, activityTypes, startDate, endDate, limit = 50, offset = 0 } = options;
  const supabase = await createClient();

  let query = supabase
    .from("post_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (postId) {
    query = query.eq("post_id", postId);
  }
  if (actorId) {
    query = query.eq("actor_id", actorId);
  }
  if (activityTypes && activityTypes.length > 0) {
    query = query.in("activity_type", activityTypes);
  }
  if (startDate) {
    query = query.gte("created_at", startDate);
  }
  if (endDate) {
    query = query.lte("created_at", endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getActivityLogs] Error:", error.message);
    return [];
  }

  return (data || []) as PostActivityLog[];
}

// ============================================================================
// Get Moderation Activity Logs
// ============================================================================

const MODERATION_TYPES: PostActivityType[] = [
  "reported",
  "flagged",
  "unflagged",
  "approved",
  "rejected",
  "hidden",
  "unhidden",
];

/**
 * Get moderation-related activity logs
 */
export async function getModerationActivityLogs(
  options: {
    postId?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PostActivityLog[]> {
  return getActivityLogs({
    ...options,
    activityTypes: MODERATION_TYPES,
  });
}

// ============================================================================
// Get Arrangement Activity Logs
// ============================================================================

const ARRANGEMENT_TYPES: PostActivityType[] = [
  "contacted",
  "arranged",
  "arrangement_cancelled",
  "collected",
  "not_collected",
];

/**
 * Get arrangement-related activity logs
 */
export async function getArrangementActivityLogs(
  options: {
    postId?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PostActivityLog[]> {
  return getActivityLogs({
    ...options,
    activityTypes: ARRANGEMENT_TYPES,
  });
}

// ============================================================================
// Get Activity Stats for Dashboard (Cached)
// ============================================================================

export interface ActivityDashboardStats {
  todayActivities: number;
  weekActivities: number;
  monthActivities: number;
  topActivityTypes: Array<{ type: PostActivityType; count: number }>;
}

/**
 * Get activity statistics for admin dashboard
 * Uses optimized RPC for counts + parallel fetch for top types
 */
export async function getActivityDashboardStats(): Promise<ActivityDashboardStats> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.POST_ACTIVITY, CACHE_TAGS.POST_ACTIVITY_STATS);

  const cacheKey = "dashboard-stats";

  logCacheOperation("miss", cacheKey);
  const supabase = createCachedClient();

  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel fetch: RPC for counts + query for top types
  const [statsResult, typeData] = await Promise.all([
    // Single RPC replaces 3 COUNT queries
    supabase.rpc("get_activity_dashboard_stats"),
    // Still need separate query for top activity types
    supabase.from("post_activity_logs").select("activity_type").gte("created_at", monthStart),
  ]);

  // Aggregate activity types
  const typeCounts: Record<string, number> = {};
  for (const row of typeData.data || []) {
    typeCounts[row.activity_type] = (typeCounts[row.activity_type] || 0) + 1;
  }

  const topActivityTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type: type as PostActivityType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const rpcStats = statsResult.data?.[0];
  const stats = {
    todayActivities: Number(rpcStats?.today_activities) || 0,
    weekActivities: Number(rpcStats?.week_activities) || 0,
    monthActivities: Number(rpcStats?.month_activities) || 0,
    topActivityTypes,
  };

  logCacheOperation("set", cacheKey, {
    today: stats.todayActivities,
    week: stats.weekActivities,
  });

  return stats;
}

// ============================================================================
// Parallel Data Fetching Helper
// ============================================================================

/**
 * Fetch multiple post activity data in parallel
 * Bleeding-edge pattern for optimal Server Component performance
 */
export async function getPostActivityData(postId: number): Promise<{
  timeline: PostActivityTimelineItem[];
  counts: Partial<Record<PostActivityType, number>>;
  recent: PostActivityLog[];
}> {
  const [timeline, counts, recent] = await Promise.all([
    getPostActivityTimeline(postId, { limit: 20 }),
    getPostActivityCounts(postId),
    getRecentPostActivities(postId, 10),
  ]);

  return { timeline, counts, recent };
}
