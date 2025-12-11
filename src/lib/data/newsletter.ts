/**
 * Newsletter & Campaign Data Layer
 * Server-side data fetching for email marketing
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  campaign_type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  criteria: Record<string, unknown>;
  cached_count: number;
  color: string;
  icon_name: string;
  is_system: boolean;
  created_at: string;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: "draft" | "active" | "paused" | "archived";
  total_enrolled: number;
  total_completed: number;
  total_converted: number;
  created_at: string;
}

export interface NewsletterStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalSubscribers: number;
  activeAutomations: number;
}

// ============================================================================
// Campaigns
// ============================================================================

export async function getCampaigns(limit = 20): Promise<Campaign[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select(
      `
      id, name, subject, preview_text, status, campaign_type,
      scheduled_at, sent_at, total_recipients, total_sent,
      total_opened, total_clicked, created_at
    `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch campaigns:", error.message);
    return [];
  }

  return (data ?? []) as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Failed to fetch campaign:", error.message);
    return null;
  }

  return data as Campaign;
}

// ============================================================================
// Segments
// ============================================================================

export async function getSegments(): Promise<Segment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("audience_segments").select("*").order("name");

  if (error) {
    console.error("Failed to fetch segments:", error.message);
    return [];
  }

  return (data ?? []) as Segment[];
}

export async function calculateSegmentCount(segmentId: string): Promise<number> {
  const supabase = await createClient();

  // Get segment criteria
  const { data: segment } = await supabase
    .from("audience_segments")
    .select("criteria")
    .eq("id", segmentId)
    .single();

  if (!segment) return 0;

  // For now, return cached count - real implementation would query based on criteria
  const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  return count || 0;
}

// ============================================================================
// Automation Flows
// ============================================================================

export async function getAutomationFlows(): Promise<AutomationFlow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_automation_flows")
    .select(
      `
      id, name, description, trigger_type, status,
      total_enrolled, total_completed, total_converted, created_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch automation flows:", error.message);
    return [];
  }

  return (data ?? []) as AutomationFlow[];
}

// ============================================================================
// Newsletter Stats
// ============================================================================

export async function getNewsletterStats(): Promise<NewsletterStats> {
  const supabase = await createClient();

  // Fetch campaign stats
  const { data: campaigns } = await supabase
    .from("newsletter_campaigns")
    .select("total_sent, total_opened, total_clicked")
    .eq("status", "sent");

  const totalCampaigns = campaigns?.length || 0;
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.total_sent || 0), 0) || 0;
  const totalOpened = campaigns?.reduce((sum, c) => sum + (c.total_opened || 0), 0) || 0;
  const totalClicked = campaigns?.reduce((sum, c) => sum + (c.total_clicked || 0), 0) || 0;

  const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
  const avgClickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

  // Fetch subscriber count
  const { count: subscriberCount } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Fetch active automations
  const { count: automationCount } = await supabase
    .from("email_automation_flows")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return {
    totalCampaigns,
    totalSent,
    avgOpenRate: Math.round(avgOpenRate * 10) / 10,
    avgClickRate: Math.round(avgClickRate * 10) / 10,
    totalSubscribers: subscriberCount || 0,
    activeAutomations: automationCount || 0,
  };
}

// ============================================================================
// Subscribers
// ============================================================================

export async function getSubscriberCount(): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return count || 0;
}

export async function getRecentSubscribers(limit = 10): Promise<
  Array<{
    id: string;
    email: string;
    first_name: string | null;
    subscribed_at: string;
    source: string;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id, email, first_name, subscribed_at, source")
    .eq("status", "active")
    .order("subscribed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch subscribers:", error.message);
    return [];
  }

  return data ?? [];
}
