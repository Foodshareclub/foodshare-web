/**
 * Platform Metrics Data Fetching
 * Retrieves and calculates platform-wide metrics from the database
 */

import { createClient } from "@/lib/supabase/server";
import type { ChurnData, EmailCampaignData, PlatformMetrics } from "./types";

interface ProfileActivityRow {
  id: string;
  created_time: string | null;
  last_seen_at: string | null;
}

interface PostMetricRow {
  id: number;
  created_at: string | null;
  is_active: boolean | null;
  post_type: string | null;
  post_views: number | null;
}

interface EmailLogRow {
  id: number;
  created_at: string | null;
  status: string | null;
  provider_used: string | null;
}

/**
 * Get platform metrics from database
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = await createClient();

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [{ data: profiles }, { data: posts }, { count: messageCount }] = await Promise.all([
    supabase.from("profiles").select("id,created_time,last_seen_at"),
    supabase.from("posts").select("id,created_at,is_active,post_type,post_views"),
    supabase.from("messages").select("*", { count: "exact", head: true }),
  ]);

  const profileRows = (profiles ?? []) as ProfileActivityRow[];
  const postRows = (posts ?? []) as PostMetricRow[];

  const activeUsers7d = profileRows.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last7Days).length;

  const activeUsers30d = profileRows.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last30Days).length;

  const newListings7d = postRows.filter((l) => l.created_at && new Date(l.created_at) > last7Days).length;

  const newListings30d = postRows.filter((l) => l.created_at && new Date(l.created_at) > last30Days).length;

  const listingsByCategory = postRows.reduce<Record<string, number>>((acc, l) => {
    const cat = l.post_type || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalViews = postRows.reduce((sum, l) => sum + (l.post_views || 0), 0);

  return {
    totalUsers: profileRows.length,
    activeUsers7d,
    activeUsers30d,
    totalListings: postRows.length,
    activeListings: postRows.filter((l) => l.is_active).length,
    newListings7d,
    newListings30d,
    totalMessages: messageCount ?? 0,
    listingsByCategory,
    averageViews: postRows.length ? totalViews / postRows.length : 0,
  };
}

/**
 * Get user churn data
 */
export async function getChurnData(): Promise<ChurnData> {
  const supabase = await createClient();

  const { data: profiles } = await supabase.from("profiles").select("id,last_seen_at");

  const now = new Date();
  const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const profileRows = (profiles ?? []) as ProfileActivityRow[];

  const atRiskUsers = profileRows.filter((u) => u.last_seen_at && new Date(u.last_seen_at) < inactiveThreshold).length;

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
    .select("id,created_at,status,provider_used")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return null;

  const emailRows = (emails ?? []) as EmailLogRow[];

  const successRate = emailRows.length
    ? (emailRows.filter((e) => e.status === "sent").length / emailRows.length) * 100
    : 100;

  const sendTimes = emailRows.reduce<Record<number, number>>((acc, email) => {
    if (!email.created_at) return acc;
    const hour = new Date(email.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const bestSendTime = Object.entries(sendTimes).sort((a, b) => b[1] - a[1])[0]?.[0];

  const providerStats = emailRows.reduce<Record<string, number>>((acc, e) => {
    const provider = e.provider_used || "unknown";
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  return {
    totalEmails: emailRows.length,
    successRate,
    bestSendTime: bestSendTime ? `${bestSendTime}:00` : "N/A",
    providerStats,
  };
}
