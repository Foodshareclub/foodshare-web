"use server";

/**
 * Analytics sync actions.
 *
 * The MotherDuck token and the analytics staging tables must stay on the
 * server: the previous client-side page read the token with the public anon key
 * and interpolated row values straight into SQL.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/admin-check";
import { getMotherDuckToken } from "@/lib/email/vault";
import { logger } from "@/lib/logger";

const MOTHERDUCK_API = "https://api.motherduck.com/v1/sql";
const MOTHERDUCK_DATABASE = "foodshare_analytics";

export interface AnalyticsSyncCounts {
  dailyStats: number;
  userActivity: number;
  postActivity: number;
}

export interface AnalyticsConnectivityResult {
  success: boolean;
  message: string;
  dailyStatsRecords?: number;
}

export interface AnalyticsSyncResult {
  success: boolean;
  message: string;
  counts?: AnalyticsSyncCounts;
}

interface MotherDuckResponse {
  data?: Record<string, unknown>[];
  error?: string;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString()}'`;

  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text === undefined) return "NULL";
  return `'${text.replace(/'/g, "''")}'`;
}

async function executeMotherDuckSQL(sql: string): Promise<MotherDuckResponse> {
  const token = await getMotherDuckToken();
  if (!token) {
    throw new Error("MotherDuck token not configured");
  }

  const response = await fetch(MOTHERDUCK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MotherDuck API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function ensureSchema(): Promise<void> {
  await executeMotherDuckSQL(`
    CREATE DATABASE IF NOT EXISTS ${MOTHERDUCK_DATABASE};
    USE ${MOTHERDUCK_DATABASE};

    CREATE TABLE IF NOT EXISTS daily_stats (
      date DATE PRIMARY KEY,
      new_users INTEGER,
      active_users INTEGER,
      returning_users INTEGER,
      new_listings INTEGER,
      completed_shares INTEGER,
      messages_sent INTEGER,
      top_categories JSON,
      computed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_activity_summary (
      user_id VARCHAR PRIMARY KEY,
      listings_viewed INTEGER,
      listings_saved INTEGER,
      messages_initiated INTEGER,
      shares_completed INTEGER,
      last_activity_at TIMESTAMP,
      updated_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS post_activity_daily_stats (
      id VARCHAR PRIMARY KEY,
      date DATE,
      post_type VARCHAR,
      posts_viewed INTEGER,
      posts_arranged INTEGER,
      total_likes INTEGER,
      updated_at TIMESTAMP
    );
  `);
}

export async function testAnalyticsConnectivity(): Promise<AnalyticsConnectivityResult> {
  try {
    await requireAdmin();

    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("analytics_daily_stats")
      .select("*", { count: "exact", head: true });

    if (error) {
      return {
        success: false,
        message: `PostgreSQL check failed: ${error.message}`,
      };
    }

    const dailyStatsRecords = count ?? 0;

    const result = await executeMotherDuckSQL("SELECT 1 as test");
    if (result.error) {
      return {
        success: false,
        message: `MotherDuck check failed: ${result.error}`,
        dailyStatsRecords,
      };
    }

    return {
      success: true,
      message: `PostgreSQL: ${dailyStatsRecords} daily stats records. MotherDuck reachable.`,
      dailyStatsRecords,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed";
    logger.error(
      "Analytics connectivity test failed",
      error instanceof Error ? error : new Error(message)
    );
    return { success: false, message };
  }
}

export async function syncAnalyticsToMotherDuck(fullSync = false): Promise<AnalyticsSyncResult> {
  try {
    await requireAdmin();

    const supabase = createAdminClient();
    const unsynced = fullSync ? {} : { synced_to_motherduck: false };

    const [dailyStatsResult, userActivityResult, postActivityResult] = await Promise.all([
      supabase.from("analytics_daily_stats").select("*").match(unsynced),
      supabase.from("analytics_user_activity").select("*").match(unsynced),
      supabase.from("analytics_post_activity").select("*").match(unsynced),
    ]);

    if (dailyStatsResult.error) throw dailyStatsResult.error;
    if (userActivityResult.error) throw userActivityResult.error;
    if (postActivityResult.error) throw postActivityResult.error;

    const dailyStats = dailyStatsResult.data ?? [];
    const userActivity = userActivityResult.data ?? [];
    const postActivity = postActivityResult.data ?? [];

    if (dailyStats.length === 0 && userActivity.length === 0 && postActivity.length === 0) {
      return {
        success: true,
        message: "Nothing to sync.",
        counts: { dailyStats: 0, userActivity: 0, postActivity: 0 },
      };
    }

    await ensureSchema();

    for (const row of dailyStats as Record<string, unknown>[]) {
      await executeMotherDuckSQL(
        `INSERT OR REPLACE INTO daily_stats VALUES (${sqlLiteral(row.date)}, ${sqlLiteral(
          row.new_users
        )}, ${sqlLiteral(row.active_users)}, ${sqlLiteral(row.returning_users)}, ${sqlLiteral(
          row.new_listings
        )}, ${sqlLiteral(row.completed_shares)}, ${sqlLiteral(row.messages_sent)}, ${sqlLiteral(
          row.top_categories
        )}, ${sqlLiteral(row.computed_at)})`
      );
    }

    for (const row of userActivity as Record<string, unknown>[]) {
      await executeMotherDuckSQL(
        `INSERT OR REPLACE INTO user_activity_summary VALUES (${sqlLiteral(row.user_id)}, ${sqlLiteral(
          row.listings_viewed
        )}, ${sqlLiteral(row.listings_saved)}, ${sqlLiteral(row.messages_initiated)}, ${sqlLiteral(
          row.shares_completed
        )}, ${sqlLiteral(row.last_activity_at)}, ${sqlLiteral(row.updated_at)})`
      );
    }

    for (const row of postActivity as Record<string, unknown>[]) {
      await executeMotherDuckSQL(
        `INSERT OR REPLACE INTO post_activity_daily_stats VALUES (${sqlLiteral(row.id)}, ${sqlLiteral(
          row.date
        )}, ${sqlLiteral(row.post_type)}, ${sqlLiteral(row.posts_viewed)}, ${sqlLiteral(
          row.post_arranged
        )}, ${sqlLiteral(row.total_likes)}, ${sqlLiteral(row.updated_at)})`
      );
    }

    if (!fullSync) {
      if (dailyStats.length > 0) {
        await supabase
          .from("analytics_daily_stats")
          .update({ synced_to_motherduck: true })
          .in(
            "date",
            dailyStats.map((row) => row.date)
          );
      }
      if (userActivity.length > 0) {
        await supabase
          .from("analytics_user_activity")
          .update({ synced_to_motherduck: true })
          .in(
            "user_id",
            userActivity.map((row) => row.user_id)
          );
      }
      if (postActivity.length > 0) {
        await supabase
          .from("analytics_post_activity")
          .update({ synced_to_motherduck: true })
          .in(
            "id",
            postActivity.map((row) => row.id)
          );
      }
    }

    return {
      success: true,
      message: "Sync complete.",
      counts: {
        dailyStats: dailyStats.length,
        userActivity: userActivity.length,
        postActivity: postActivity.length,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    logger.error(
      "Analytics sync to MotherDuck failed",
      error instanceof Error ? error : new Error(message)
    );
    return { success: false, message };
  }
}
