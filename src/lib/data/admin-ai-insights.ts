/**
 * Admin AI Insights Data Layer
 * Fetches metrics for AI-powered insights dashboard
 */

import { createClient } from "@/lib/supabase/server";

export interface AIInsightsData {
  activeUsers7d: number;
  totalUsers: number;
  activeListings: number;
  newListings7d: number;
  churnRate: number;
  atRiskUsers: number;
  totalChats: number;
  newChats7d: number;
}

export async function getAIInsightsData(): Promise<AIInsightsData> {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    { count: totalUsers },
    { count: activeUsers7d },
    { count: activeListings },
    { count: newListings7d },
    { count: totalChats },
    { count: newChats7d },
    { count: inactiveUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_seen_at", sevenDaysAgo.toISOString()),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("rooms").select("*", { count: "exact", head: true }),
    supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Users inactive for 30+ days
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .lt("last_seen_at", thirtyDaysAgo.toISOString()),
  ]);

  const total = totalUsers ?? 0;
  const inactive = inactiveUsers ?? 0;
  const churnRate = total > 0 ? (inactive / total) * 100 : 0;

  return {
    activeUsers7d: activeUsers7d ?? 0,
    totalUsers: total,
    activeListings: activeListings ?? 0,
    newListings7d: newListings7d ?? 0,
    churnRate,
    atRiskUsers: inactive,
    totalChats: totalChats ?? 0,
    newChats7d: newChats7d ?? 0,
  };
}
