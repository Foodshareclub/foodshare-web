/**
 * Email Queue, Campaigns, Automations & Segments
 * Queue management, campaign tracking, automation flows, audience segmentation
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "../cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

export interface QueueStats {
  pending: number;
  processing: number;
  failed: number;
  deadLetter: number;
  completed: number;
  totalToday: number;
}

export interface RecentCampaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused" | "cancelled";
  campaignType: string;
  totalRecipients: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ActiveAutomation {
  id: string;
  name: string;
  triggerType: string;
  status: "draft" | "active" | "paused" | "archived";
  totalEnrolled: number;
  totalCompleted: number;
  totalConverted: number;
  conversionRate: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description: string | null;
  cachedCount: number;
  color: string;
  iconName: string;
  isSystem: boolean;
}

// ============================================================================
// Queue Functions
// ============================================================================

/**
 * Get email queue statistics
 * Uses admin client to bypass RLS
 */
export async function getQueueStats(): Promise<QueueStats> {
  const supabase = createAdminClient();

  const [queueRes, dlqRes] = await Promise.all([
    supabase.from("email_queue").select("status"),
    supabase.from("email_dead_letter_queue").select("id", { count: "exact", head: true }),
  ]);

  const queue = queueRes.data || [];
  const statusCounts = queue.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    pending: statusCounts["pending"] || 0,
    processing: statusCounts["processing"] || 0,
    failed: statusCounts["failed"] || 0,
    deadLetter: dlqRes.count || 0,
    completed: statusCounts["completed"] || 0,
    totalToday: queue.length,
  };
}

/**
 * Get queued emails with optional status filter
 * Uses admin client to bypass RLS for admin-only data
 */
export async function getQueuedEmails(params: { status?: string }) {
  const supabase = createAdminClient();

  let query = supabase
    .from("email_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getQueuedEmails] Error:", error);
    return [];
  }

  return (data || []).map((email) => ({
    id: email.id,
    recipient_email: email.recipient_email,
    email_type: email.email_type,
    template_name: email.template_name || "",
    attempts: email.attempts || 0,
    max_attempts: email.max_attempts || 3,
    status: email.status,
    last_error: email.last_error,
    next_retry_at: email.next_retry_at,
    created_at: email.created_at,
  }));
}

// ============================================================================
// Campaigns
// ============================================================================

export async function getRecentCampaigns(limit = 10): Promise<RecentCampaign[]> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.CAMPAIGNS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select(
      `
    id, name, subject, status, campaign_type,
    total_recipients, total_sent, total_opened, total_clicked,
    scheduled_at, sent_at, created_at
  `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch campaigns:", error.message);
    return [];
  }

  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    status: c.status,
    campaignType: c.campaign_type,
    totalRecipients: c.total_recipients || 0,
    totalSent: c.total_sent || 0,
    totalOpened: c.total_opened || 0,
    totalClicked: c.total_clicked || 0,
    scheduledAt: c.scheduled_at,
    sentAt: c.sent_at,
    createdAt: c.created_at,
  }));
}

// ============================================================================
// Automations
// ============================================================================

export async function getActiveAutomations(): Promise<ActiveAutomation[]> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.AUTOMATIONS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("email_automation_flows")
    .select(
      `
    id, name, trigger_type, status,
    total_enrolled, total_completed, total_converted
  `
    )
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch automations:", error.message);
    return [];
  }

  return (data || []).map((a) => ({
    id: a.id,
    name: a.name,
    triggerType: a.trigger_type,
    status: a.status,
    totalEnrolled: a.total_enrolled || 0,
    totalCompleted: a.total_completed || 0,
    totalConverted: a.total_converted || 0,
    conversionRate:
      a.total_enrolled > 0 ? Math.round((a.total_converted / a.total_enrolled) * 1000) / 10 : 0,
  }));
}

// ============================================================================
// Segments
// ============================================================================

export async function getAudienceSegments(): Promise<AudienceSegment[]> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.SEGMENTS);

  const supabase = createCachedClient();

  const { data, error } = await supabase.from("audience_segments").select("*").order("name");

  if (error) {
    console.error("Failed to fetch segments:", error.message);
    return [];
  }

  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    cachedCount: s.cached_count || 0,
    color: s.color || "#6366f1",
    iconName: s.icon_name || "users",
    isSystem: s.is_system || false,
  }));
}
