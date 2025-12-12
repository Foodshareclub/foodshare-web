"use server";

import { MotherDuckService } from "@/lib/analytics/motherduck";
import { createClient } from "@/lib/supabase/server";
import { serverActionError, serverActionSuccess } from "@/lib/errors/server-actions";
import { ServerActionResult } from "@/lib/errors/types";

export interface AnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  totalListings: number;
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

    // Since we don't have real data in MotherDuck yet, we'll try a simple query.
    // If it fails (e.g. table doesn't exist), we'll return mock data or handle it gracefully
    // so the UI doesn't break during this initial integration phase.

    // Ideally, we would query:
    // SELECT count(*) as total_users FROM users
    // But we need to know the table names in the MotherDuck instance.
    // Query real data from MotherDuck
    const [eventStats] = await MotherDuckService.runQuery<{ count: number }>(
      "SELECT count(*) as count FROM events"
    );

    // Return real data mixed with mocks for now
    return serverActionSuccess({
      totalUsers: 12543, // Mock
      activeUsers: eventStats?.count || 0, // Real request count as proxy for active users
      totalListings: 4521, // Mock
      listingsChange: 12.5, // Mock
      foodSavedKg: 15420, // Mock
    });
  } catch (error) {
    console.error("Analytics error:", error);
    // Fallback Mock Data on error (for demo purposes if connection fails)
    // In production we should return the error.
    return serverActionSuccess({
      totalUsers: 0,
      activeUsers: 0,
      totalListings: 0,
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

    // Mock data for charts
    return serverActionSuccess([
      { month: "Jan", users: 400, listings: 240 },
      { month: "Feb", users: 300, listings: 139 },
      { month: "Mar", users: 200, listings: 980 },
      { month: "Apr", users: 278, listings: 390 },
      { month: "May", users: 189, listings: 480 },
      { month: "Jun", users: 239, listings: 380 },
      { month: "Jul", users: 349, listings: 430 },
    ]);
  } catch (error) {
    return serverActionError("Failed to fetch growth data", "UNKNOWN_ERROR");
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
  [key: string]: any;
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
  properties: Record<string, any> = {}
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

    const propertiesJson = JSON.stringify(properties).replace(/'/g, "''"); // Basic escaping

    // Insert into MotherDuck
    const query = `
      INSERT INTO events (id, event_name, user_id, properties, timestamp) 
      VALUES ('${eventId}', '${eventName}', '${userId}', '${propertiesJson}', '${timestamp}')
    `;

    await MotherDuckService.runQuery(query);
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

    const query = `
      SELECT 
        case 
          when date_diff('day', created_at, current_date) < 7 then '0-7 days'
          when date_diff('day', created_at, current_date) < 30 then '7-30 days'
          else '30+ days'
        end as bucket,
        count(*) as count
      FROM full_listings
      WHERE status = 'available'
      GROUP BY 1
    `;

    const results = await MotherDuckService.runQuery<InventoryAge>(query);
    return serverActionSuccess(results);
  } catch (error) {
    console.error("Failed to fetch inventory aging:", error);
    return serverActionSuccess([]);
  }
}
