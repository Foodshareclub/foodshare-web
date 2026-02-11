"use server";

import { createClient } from "@/lib/supabase/server";
import { serverActionError, serverActionSuccess } from "@/lib/errors";
import type { ServerActionResult } from "@/lib/errors";

// NOTE: READ functions have been moved to @/lib/data/analytics
// This file only contains WRITE/mutation actions per the architecture rule.

// NOTE: Types (AnalyticsSummary, MonthlyGrowth, etc.) are now exported from
// @/lib/data/analytics. Import them from there, not from this file.
// ('use server' files cannot re-export types per project rules)

/**
 * Track an analytics event.
 * Currently a no-op since we don't have MotherDuck in Vercel.
 * In production, you'd send this to a dedicated analytics service.
 */
export async function trackEvent(
  _eventName: string,
  _properties: Record<string, unknown> = {}
): Promise<void> {
  // No-op - MotherDuck doesn't work in Vercel
  // Consider using a service like PostHog, Mixpanel, or Amplitude
}

/**
 * Trigger Analytics Sync
 * No-op since we're querying Supabase directly now
 */
export interface TriggerSyncResult {
  success: boolean;
  mode: "full" | "incremental";
  synced: {
    users: number;
    listings: number;
  };
  durationMs?: number;
  error?: string;
}

export async function triggerAnalyticsSync(
  _mode: "full" | "incremental" = "incremental"
): Promise<ServerActionResult<TriggerSyncResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // No sync needed - we query Supabase directly
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: listingCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    return serverActionSuccess({
      success: true,
      mode: "incremental",
      synced: {
        users: userCount || 0,
        listings: listingCount || 0,
      },
      durationMs: 0,
    });
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Unknown error",
      "SERVER_ERROR"
    );
  }
}
