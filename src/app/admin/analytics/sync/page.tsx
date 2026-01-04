"use client";

/**
 * Admin Analytics Sync Page
 *
 * Uses MotherDuck WASM client to sync analytics from PostgreSQL staging tables.
 * Requires cross-origin isolation headers (configured in next.config.ts).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface SyncStats {
  dailyStats: number;
  userActivity: number;
  postActivity: number;
}

export default function AnalyticsSyncPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnectivity = async () => {
    setIsTesting(true);
    setError(null);
    setStatus("Testing connectivity...");

    try {
      // Test Supabase connection
      const supabase = createClient();
      const { count: dailyCount } = await supabase
        .from("analytics_daily_stats")
        .select("*", { count: "exact", head: true });

      setStatus(`PostgreSQL: ${dailyCount} daily stats records found`);

      // Test MotherDuck connection
      const { MDConnection } = await import("@motherduck/wasm-client");

      // Get token from Vault via Edge Function
      const { data: tokenData } = await supabase.rpc("get_vault_secret", {
        secret_name: "MOTHERDUCK_TOKEN",
      });

      if (!tokenData) {
        throw new Error("MOTHERDUCK_TOKEN not found in Vault");
      }

      const conn = MDConnection.create({ mdToken: tokenData });
      await conn.isInitialized();

      const result = await conn.evaluateQuery("SELECT 1 as test");
      if (result.type === "materialized") {
        setStatus("✓ Both PostgreSQL and MotherDuck connections working!");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed");
      setStatus("");
    } finally {
      setIsTesting(false);
    }
  };

  const syncToMotherDuck = async (fullSync = false) => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    setStatus("Starting sync...");

    try {
      const supabase = createClient();

      // Get MotherDuck token from Vault
      setStatus("Fetching MotherDuck token...");
      const { data: tokenData, error: tokenError } = await supabase.rpc("get_vault_secret", {
        secret_name: "MOTHERDUCK_TOKEN",
      });

      if (tokenError || !tokenData) {
        throw new Error("Failed to get MOTHERDUCK_TOKEN from Vault");
      }

      // Initialize MotherDuck WASM client
      setStatus("Connecting to MotherDuck...");
      const { MDConnection } = await import("@motherduck/wasm-client");
      const conn = MDConnection.create({ mdToken: tokenData });
      await conn.isInitialized();

      // Create tables if they don't exist
      setStatus("Ensuring MotherDuck schema...");
      await conn.evaluateQuery(`
        CREATE DATABASE IF NOT EXISTS foodshare_analytics;
        USE foodshare_analytics;
        
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

      // Fetch data from PostgreSQL
      const whereClause = fullSync ? {} : { synced_to_motherduck: false };

      setStatus("Fetching daily stats from PostgreSQL...");
      const { data: dailyStats } = await supabase
        .from("analytics_daily_stats")
        .select("*")
        .match(whereClause);

      setStatus("Fetching user activity from PostgreSQL...");
      const { data: userActivity } = await supabase
        .from("analytics_user_activity")
        .select("*")
        .match(whereClause);

      setStatus("Fetching post activity from PostgreSQL...");
      const { data: postActivity } = await supabase
        .from("analytics_post_activity")
        .select("*")
        .match(whereClause);

      // Sync daily stats
      if (dailyStats && dailyStats.length > 0) {
        setStatus(`Syncing ${dailyStats.length} daily stats...`);
        for (const row of dailyStats) {
          await conn.evaluateQuery(`
            INSERT OR REPLACE INTO daily_stats VALUES (
              '${row.date}', ${row.new_users}, ${row.active_users}, ${row.returning_users},
              ${row.new_listings}, ${row.completed_shares}, ${row.messages_sent},
              '${JSON.stringify(row.top_categories).replace(/'/g, "''")}',
              '${row.computed_at}'
            )
          `);
        }
      }

      // Sync user activity
      if (userActivity && userActivity.length > 0) {
        setStatus(`Syncing ${userActivity.length} user activity records...`);
        for (const row of userActivity) {
          await conn.evaluateQuery(`
            INSERT OR REPLACE INTO user_activity_summary VALUES (
              '${row.user_id}', ${row.listings_viewed}, ${row.listings_saved},
              ${row.messages_initiated}, ${row.shares_completed},
              ${row.last_activity_at ? `'${row.last_activity_at}'` : "NULL"},
              '${row.updated_at}'
            )
          `);
        }
      }

      // Sync post activity
      if (postActivity && postActivity.length > 0) {
        setStatus(`Syncing ${postActivity.length} post activity records...`);
        for (const row of postActivity) {
          await conn.evaluateQuery(`
            INSERT OR REPLACE INTO post_activity_daily_stats VALUES (
              '${row.id}', '${row.date}', '${row.post_type}',
              ${row.posts_viewed}, ${row.posts_arranged}, ${row.total_likes},
              '${row.updated_at}'
            )
          `);
        }
      }

      // Mark as synced in PostgreSQL
      if (!fullSync) {
        setStatus("Marking records as synced...");
        if (dailyStats?.length) {
          await supabase
            .from("analytics_daily_stats")
            .update({ synced_to_motherduck: true })
            .in(
              "date",
              dailyStats.map((r) => r.date)
            );
        }
        if (userActivity?.length) {
          await supabase
            .from("analytics_user_activity")
            .update({ synced_to_motherduck: true })
            .in(
              "user_id",
              userActivity.map((r) => r.user_id)
            );
        }
        if (postActivity?.length) {
          await supabase
            .from("analytics_post_activity")
            .update({ synced_to_motherduck: true })
            .in(
              "id",
              postActivity.map((r) => r.id)
            );
        }
      }

      setStats({
        dailyStats: dailyStats?.length || 0,
        userActivity: userActivity?.length || 0,
        postActivity: postActivity?.length || 0,
      });
      setStatus("✓ Sync complete!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Analytics Sync to MotherDuck</h1>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            This syncs analytics data from PostgreSQL staging tables to MotherDuck. The sync runs in
            your browser using MotherDuck WASM client.
          </p>
        </div>

        <div className="flex gap-4">
          <Button onClick={testConnectivity} disabled={isTesting || isLoading} variant="outline">
            {isTesting ? "Testing..." : "Test Connectivity"}
          </Button>

          <Button onClick={() => syncToMotherDuck(false)} disabled={isLoading || isTesting}>
            {isLoading ? "Syncing..." : "Incremental Sync"}
          </Button>

          <Button
            onClick={() => syncToMotherDuck(true)}
            disabled={isLoading || isTesting}
            variant="secondary"
          >
            Full Sync
          </Button>
        </div>

        {status && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">{status}</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {stats && (
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <h3 className="font-medium mb-2">Sync Results</h3>
            <ul className="text-sm space-y-1">
              <li>Daily Stats: {stats.dailyStats} records</li>
              <li>User Activity: {stats.userActivity} records</li>
              <li>Post Activity: {stats.postActivity} records</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
