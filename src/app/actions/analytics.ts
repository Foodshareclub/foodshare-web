"use server";

import { createClient } from "@/lib/supabase/server";
import { serverActionError, serverActionSuccess } from "@/lib/errors/server-actions";
import { ServerActionResult } from "@/lib/errors/types";

// Dynamic import to avoid bundling duckdb-async at build time
// DuckDB native binaries don't work in Vercel's serverless environment
async function getMotherDuckService() {
  const { MotherDuckService } = await import("@/lib/analytics/motherduck");
  return MotherDuckService;
}

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
  activeListings: number;
  listingsChange: number;
  foodSavedKg: number;
}

export interface MonthlyGrowth {
  month: string;
  users: number;
  listings: number;
}

export async function getAnalyticsSummary(): Promise<ServerActionResult<AnalyticsSummary>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    const MotherDuckService = await getMotherDuckService();

    // Query real data from MotherDuck synced tables
    const summaryQuery = `
      WITH user_stats AS (
        SELECT
          count(*) as total_users,
          count(case when is_active = true then 1 end) as active_users
        FROM full_users
      ),
      listing_stats AS (
        SELECT
          count(*) as total_listings,
          count(case when is_active = true AND is_arranged = false then 1 end) as active_listings,
          count(case when is_arranged = true then 1 end) as arranged_listings
        FROM full_listings
      ),
      listing_change AS (
        SELECT
          count(case when created_at >= current_date - INTERVAL 30 DAY then 1 end) as this_month,
          count(case when created_at >= current_date - INTERVAL 60 DAY AND created_at < current_date - INTERVAL 30 DAY then 1 end) as last_month
        FROM full_listings
      )
      SELECT
        u.total_users,
        u.active_users,
        l.total_listings,
        l.active_listings,
        l.arranged_listings,
        CASE
          WHEN c.last_month > 0 THEN ((c.this_month - c.last_month)::FLOAT / c.last_month) * 100
          ELSE 0
        END as listings_change
      FROM user_stats u, listing_stats l, listing_change c
    `;

    const [stats] = await MotherDuckService.runQuery<{
      total_users: number;
      active_users: number;
      total_listings: number;
      active_listings: number;
      arranged_listings: number;
      listings_change: number;
    }>(summaryQuery);

    // Estimate food saved: ~2kg average per arranged listing
    const foodSavedKg = (stats?.arranged_listings || 0) * 2;

    return serverActionSuccess({
      totalUsers: stats?.total_users || 0,
      activeUsers: stats?.active_users || 0,
      totalListings: stats?.total_listings || 0,
      activeListings: stats?.active_listings || 0,
      listingsChange: Math.round((stats?.listings_change || 0) * 10) / 10,
      foodSavedKg,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return serverActionSuccess({
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
      activeListings: 0,
      listingsChange: 0,
      foodSavedKg: 0,
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

    const MotherDuckService = await getMotherDuckService();

    // Query monthly growth from synced data (last 12 months)
    const query = `
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', current_date - INTERVAL 11 MONTH),
          date_trunc('month', current_date),
          INTERVAL 1 MONTH
        ) as month_start
      ),
      user_counts AS (
        SELECT
          date_trunc('month', created_at) as month,
          count(*) as users
        FROM full_users
        WHERE created_at >= current_date - INTERVAL 12 MONTH
        GROUP BY 1
      ),
      listing_counts AS (
        SELECT
          date_trunc('month', created_at) as month,
          count(*) as listings
        FROM full_listings
        WHERE created_at >= current_date - INTERVAL 12 MONTH
        GROUP BY 1
      )
      SELECT
        strftime(m.month_start, '%b') as month,
        COALESCE(u.users, 0) as users,
        COALESCE(l.listings, 0) as listings
      FROM months m
      LEFT JOIN user_counts u ON date_trunc('month', u.month) = m.month_start
      LEFT JOIN listing_counts l ON date_trunc('month', l.month) = m.month_start
      ORDER BY m.month_start ASC
    `;

    const results = await MotherDuckService.runQuery<MonthlyGrowth>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch growth data:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Daily Active Users (DAU) for the last 30 days
 */
export interface DailyActiveUsers {
  date: string;
  count: number;
}

export async function getDailyActiveUsers(): Promise<ServerActionResult<DailyActiveUsers[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // MotherDuck Query: Group unique users by day
    // We use try-catch inside query execution to safely return empty data if table doesn't exist yet
    const query = `
      SELECT
        strftime(timestamp, '%Y-%m-%d') as date,
        count(distinct user_id) as count
      FROM events
      WHERE timestamp >= current_date - INTERVAL 30 DAY
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<DailyActiveUsers>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch DAU:", error);
    // Return empty array instead of error to keep UI resilient
    return serverActionSuccess([]);
  }
}

/**
 * Get distribution of event types (Top Actions)
 */
export interface EventDistribution {
  name: string;
  value: number;
  [key: string]: unknown;
}

export async function getEventDistribution(): Promise<ServerActionResult<EventDistribution[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    const query = `
      SELECT
        event_name as name,
        count(*) as value
      FROM events
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 5
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<EventDistribution>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch event distribution:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Conversion Funnel Data
 */
export interface FunnelStep {
  step: string;
  count: number;
  dropoff: number;
}

export async function getConversionFunnel(): Promise<ServerActionResult<FunnelStep[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // MotherDuck Query: Simple funnel logic
    // 1. Listing Created (Broadest)
    // 2. Food Requested (Interest)
    // 3. Food Arranged (Conversion)
    const query = `
      WITH counts AS (
        SELECT
          count(case when event_name = 'Listing Created' then 1 end) as listings,
          count(case when event_name = 'Food Requested' then 1 end) as requests,
          count(case when event_name = 'Food Arranged' then 1 end) as arranged
        FROM events
      )
      SELECT 'Listings' as step, listings as count, 0 as dropoff FROM counts
      UNION ALL
      SELECT 'Requests', requests, 1.0 - (requests::FLOAT / NULLIF(listings, 0)) FROM counts
      UNION ALL
      SELECT 'Arranged', arranged, 1.0 - (arranged::FLOAT / NULLIF(requests, 0)) FROM counts
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<FunnelStep>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch funnel:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Track an analytics event to MotherDuck.
 * Fire and forget - doesn't block the UI.
 */
export async function trackEvent(
  eventName: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Generate UUID for the event
    const eventId = crypto.randomUUID();
    const userId = user?.id || "anonymous";
    const timestamp = new Date().toISOString();

    const propertiesJson = JSON.stringify(properties);

    // Insert into MotherDuck
    const query = `
      INSERT INTO events (id, event_name, user_id, properties, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `;

    const MotherDuckService = await getMotherDuckService();
    await MotherDuckService.runQuery(query, [
      eventId,
      eventName,
      userId,
      propertiesJson,
      timestamp,
    ]);
  } catch (error) {
    // Silently fail for analytics to not break app flow
    console.error("Failed to track event:", error);
  }
}

/**
 * Get User Retention Cohorts
 * Groups users by signup month and checks for subsequent activity
 */
export interface RetentionCohort {
  cohort: string; // "2024-01"
  size: number;
  month1: number; // Percentage or count returning in month 1
  month2: number;
}

export async function getUserRetentionCohorts(): Promise<ServerActionResult<RetentionCohort[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // This query relies on 'full_users' (synced via Edge Function)
    // and 'events' (real-time).
    const query = `
      WITH cohorts AS (
         SELECT
           strftime(created_at, '%Y-%m') as cohort,
           id as user_id
         FROM full_users
      ),
      activity AS (
         SELECT distinct user_id, strftime(timestamp, '%Y-%m') as activity_month
         FROM events
      )
      SELECT
        c.cohort,
        count(distinct c.user_id) as size,
        count(distinct case when a.activity_month = strftime(date_add(strptime(c.cohort, '%Y-%m'), INTERVAL 1 MONTH), '%Y-%m') then c.user_id end) as month1,
        count(distinct case when a.activity_month = strftime(date_add(strptime(c.cohort, '%Y-%m'), INTERVAL 2 MONTH), '%Y-%m') then c.user_id end) as month2
      FROM cohorts c
      LEFT JOIN activity a ON c.user_id = a.user_id
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<RetentionCohort>(query);
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
export interface InventoryAge {
  bucket: string;
  count: number;
}

export async function getInventoryAging(): Promise<ServerActionResult<InventoryAge[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    // Query active (not arranged) listings grouped by age
    const query = `
      SELECT
        case
          when date_diff('day', created_at, current_date) < 7 then '0-7 days'
          when date_diff('day', created_at, current_date) < 30 then '7-30 days'
          else '30+ days'
        end as bucket,
        count(*) as count
      FROM full_listings
      WHERE is_active = true AND is_arranged = false
      GROUP BY 1
      ORDER BY
        CASE bucket
          WHEN '0-7 days' THEN 1
          WHEN '7-30 days' THEN 2
          ELSE 3
        END
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<InventoryAge>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch inventory aging:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Listing Type Distribution
 * Shows breakdown of listings by post_type (food, thing, borrow, etc.)
 */
export interface ListingTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export async function getListingTypeDistribution(): Promise<ServerActionResult<ListingTypeDistribution[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    const query = `
      WITH type_counts AS (
        SELECT
          post_type as type,
          count(*) as count
        FROM full_listings
        WHERE is_active = true
        GROUP BY 1
      ),
      total AS (
        SELECT sum(count) as total FROM type_counts
      )
      SELECT
        tc.type,
        tc.count,
        ROUND((tc.count::FLOAT / NULLIF(t.total, 0)) * 100, 1) as percentage
      FROM type_counts tc, total t
      ORDER BY tc.count DESC
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<ListingTypeDistribution>(query);
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
export interface TopSharer {
  userId: string;
  nickname: string;
  arrangedCount: number;
  totalListings: number;
}

export async function getTopSharers(limit: number = 10): Promise<ServerActionResult<TopSharer[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    const query = `
      SELECT
        l.profile_id as userId,
        COALESCE(u.nickname, 'Anonymous') as nickname,
        count(case when l.is_arranged = true then 1 end) as arrangedCount,
        count(*) as totalListings
      FROM full_listings l
      LEFT JOIN full_users u ON l.profile_id = u.id
      GROUP BY 1, 2
      HAVING count(case when l.is_arranged = true then 1 end) > 0
      ORDER BY arrangedCount DESC
      LIMIT ${limit}
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<TopSharer>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch top sharers:", error);
    return serverActionSuccess([]);
  }
}

/**
 * Get Sync Status
 * Returns metadata about the last sync from MotherDuck
 */
export interface SyncStatus {
  tableName: string;
  lastSyncAt: string | null;
  recordsSynced: number;
  syncMode: string;
}

export async function getSyncStatus(): Promise<ServerActionResult<SyncStatus[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverActionError("Unauthorized", "UNAUTHORIZED");

    const query = `
      SELECT
        table_name as tableName,
        last_sync_at as lastSyncAt,
        records_synced as recordsSynced,
        sync_mode as syncMode
      FROM sync_metadata
      ORDER BY table_name
    `;

    const MotherDuckService = await getMotherDuckService();
    const results = await MotherDuckService.runQuery<SyncStatus>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch sync status:", error);
    return serverActionSuccess([]);
  }
}
