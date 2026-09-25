"use client";

/**
 * Admin Analytics Sync Page
 *
 * The sync itself runs server-side: the MotherDuck token and the analytics
 * staging tables must not be reachable from the browser.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  syncAnalyticsToMotherDuck,
  testAnalyticsConnectivity,
  type AnalyticsSyncCounts,
} from "@/app/actions/analytics-sync";

export default function AnalyticsSyncPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [stats, setStats] = useState<AnalyticsSyncCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnectivity = async () => {
    setIsTesting(true);
    setError(null);
    setStatus("Testing connectivity...");

    const result = await testAnalyticsConnectivity();

    if (result.success) {
      setStatus(result.message);
    } else {
      setError(result.message);
      setStatus("");
    }
    setIsTesting(false);
  };

  const syncToMotherDuck = async (fullSync: boolean) => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    setStatus("Syncing...");

    const result = await syncAnalyticsToMotherDuck(fullSync);

    if (result.success) {
      setStats(result.counts ?? null);
      setStatus(result.message);
    } else {
      setError(result.message);
      setStatus("");
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Analytics Sync to MotherDuck</h1>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            This syncs analytics data from PostgreSQL staging tables to MotherDuck. The sync runs on
            the server so the MotherDuck token is never sent to the browser.
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
