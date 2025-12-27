/**
 * Platform Metrics Data Fetching
 * Retrieves and calculates platform-wide metrics from the database
 */

import type { PlatformMetrics, ChurnData, EmailCampaignData } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Get platform metrics from database
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = await createClient();

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [{ data: profiles }, { data: posts }, { count: messageCount }] = await Promise.all([
    supabase.from("profiles").select("id, created_time, last_seen_at"),
    supabase.from("posts").select("id, created_at, is_active, post_type, post_views"),
    supabase.from("messages").select("*", { count: "exact", head: true }),
  ]);

  const activeUsers7d =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last7Days).length ?? 0;

  const activeUsers30d =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last30Days).length ?? 0;

  const newListings7d = posts?.filter((l) => new Date(l.created_at) > last7Days).length ?? 0;

  const newListings30d = posts?.filter((l) => new Date(l.created_at) > last30Days).length ?? 0;

  const listingsByCategory = (posts ?? []).reduce((acc: Record<string, number>, l) => {
    const cat = l.post_type || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalViews = (posts ?? []).reduce((sum, l) => sum + (l.post_views || 0), 0);

  return {
    totalUsers: profiles?.length ?? 0,
    activeUsers7d,
    activeUsers30d,
    totalListings: posts?.length ?? 0,
    activeListings: posts?.filter((l) => l.is_active).length ?? 0,
    newListings7d,
    newListings30d,
    totalMessages: messageCount ?? 0,
    listingsByCategory,
    averageViews: posts?.length ? totalViews / posts.length : 0,
  };
}

/**
 * Get user churn data
 */
export async function getChurnData(): Promise<ChurnData> {
  const supabase = await createClient();

  const { data: profiles } = await supabase.from("profiles").select("id, last_seen_at");

  const now = new Date();
  const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const atRiskUsers =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) < inactiveThreshold)
      .length ?? 0;

  const totalUsers = profiles?.length ?? 0;

  return {
    totalUsers,
    atRiskUsers,
    churnRate: totalUsers > 0 ? (atRiskUsers / totalUsers) * 100 : 0,
  };
}

/**
 * Get email campaign data
 */
export async function getEmailCampaignData(): Promise<EmailCampaignData | null> {
  const supabase = await createClient();

  const { data: emails, error } = await supabase
    .from("email_logs")
    .select("id, created_at, status, provider_used")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return null;

  const successRate = emails?.length
    ? (emails.filter((e) => e.status === "sent").length / emails.length) * 100
    : 100;

  const sendTimes = (emails ?? []).reduce((acc: Record<number, number>, email) => {
    const hour = new Date(email.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const bestSendTime = Object.entries(sendTimes).sort((a, b) => b[1] - a[1])[0]?.[0];

  const providerStats = (emails ?? []).reduce((acc: Record<string, number>, e) => {
    const provider = e.provider_used || "unknown";
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  return {
    totalEmails: emails?.length ?? 0,
    successRate,
    bestSendTime: bestSendTime ? `${bestSendTime}:00` : "N/A",
    providerStats,
  };
}
