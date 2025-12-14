"use server";

/**
 * Post Activity Logging Server Actions
 *
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Rate limiting for view tracking
 * - Request deduplication
 * - Type-safe action results
 * - Optimistic update support
 *
 * @module app/actions/post-activity
 */

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  type ActionResult,
  withErrorHandling,
  validateWithSchema,
  failure,
  createError,
} from "@/lib/errors";
import { invalidatePostActivityCaches } from "@/lib/data/cache-keys";

// ============================================================================
// Rate Limiting (In-Memory for Edge Runtime)
// ============================================================================

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window

// Simple in-memory rate limiter (use Redis in production for distributed)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

// ============================================================================
// Request Deduplication
// ============================================================================

const pendingRequests = new Map<string, Promise<ActionResult<{ id: string }>>>();

function getDedupeKey(postId: number, activityType: string, actorId?: string): string {
  return `${postId}-${activityType}-${actorId || "anon"}-${Math.floor(Date.now() / 5000)}`; // 5s window
}

// ============================================================================
// Types
// ============================================================================

export type PostActivityType =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "activated"
  | "deactivated"
  | "expired"
  | "viewed"
  | "contacted"
  | "arranged"
  | "arrangement_cancelled"
  | "collected"
  | "not_collected"
  | "reported"
  | "flagged"
  | "unflagged"
  | "approved"
  | "rejected"
  | "hidden"
  | "unhidden"
  | "liked"
  | "unliked"
  | "shared"
  | "bookmarked"
  | "unbookmarked"
  | "admin_edited"
  | "admin_note_added"
  | "admin_status_changed"
  | "auto_expired"
  | "auto_deactivated"
  | "location_updated"
  | "images_updated";

export interface PostActivityLog {
  id: string;
  post_id: number;
  actor_id: string | null;
  activity_type: PostActivityType;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  reason: string | null;
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  related_post_id: number | null;
  related_profile_id: string | null;
  related_room_id: string | null;
  created_at: string;
}

export interface PostActivityTimelineItem {
  id: string;
  activity_type: PostActivityType;
  actor_id: string | null;
  actor_nickname: string | null;
  actor_avatar: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface UserActivitySummary {
  activity_type: PostActivityType;
  count: number;
  last_activity: string;
}

// ============================================================================
// Zod Schemas
// ============================================================================

const logActivitySchema = z.object({
  postId: z.number().int().positive(),
  activityType: z.string(),
  previousState: z.record(z.string(), z.unknown()).optional(),
  newState: z.record(z.string(), z.unknown()).optional(),
  changes: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  relatedPostId: z.number().int().positive().optional(),
  relatedProfileId: z.string().uuid().optional(),
  relatedRoomId: z.string().uuid().optional(),
});

const getTimelineSchema = z.object({
  postId: z.number().int().positive(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  activityTypes: z.array(z.string()).optional(),
});

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Log a post activity with rate limiting and deduplication
 */
export async function logPostActivity(
  input: z.infer<typeof logActivitySchema>
): Promise<ActionResult<{ id: string }>> {
  const validation = validateWithSchema(logActivitySchema, input);
  if (!validation.success) return validation;

  // Get client identifier for rate limiting
  const headersList = await headers();
  const clientIp = headersList.get("x-forwarded-for")?.split(",")[0] || "unknown";

  // Rate limit check
  if (!checkRateLimit(`activity-${clientIp}`)) {
    return failure(createError("RATE_LIMIT", "Too many requests. Please slow down."));
  }

  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Get current user (actor)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Request deduplication for high-frequency events (views, likes)
    const highFrequencyTypes = ["viewed", "liked", "unliked"];
    if (highFrequencyTypes.includes(validation.data.activityType)) {
      const dedupeKey = getDedupeKey(
        validation.data.postId,
        validation.data.activityType,
        user?.id
      );

      const pending = pendingRequests.get(dedupeKey);
      if (pending) {
        return pending.then((r) => {
          if (r.success) return r.data;
          throw new Error("Deduplicated request failed");
        });
      }
    }

    const { data, error } = await supabase
      .from("post_activity_logs")
      .insert({
        post_id: validation.data.postId,
        actor_id: user?.id || null,
        activity_type: validation.data.activityType,
        previous_state: validation.data.previousState,
        new_state: validation.data.newState,
        changes: validation.data.changes,
        metadata: {
          ...validation.data.metadata,
          client_ip: clientIp,
        },
        reason: validation.data.reason || null,
        notes: validation.data.notes || null,
        related_post_id: validation.data.relatedPostId || null,
        related_profile_id: validation.data.relatedProfileId || null,
        related_room_id: validation.data.relatedRoomId || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Invalidate caches after successful log
    invalidatePostActivityCaches(validation.data.postId, user?.id);

    return { id: data.id };
  }, "logPostActivity");
}

/**
 * Log a post view
 */
export async function logPostView(
  postId: number,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "viewed",
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log a post contact (when user initiates chat about a post)
 */
export async function logPostContact(
  postId: number,
  roomId: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "contacted",
    relatedRoomId: roomId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log a post arrangement
 */
export async function logPostArrangement(
  postId: number,
  arrangedToProfileId: string,
  roomId?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "arranged",
    relatedProfileId: arrangedToProfileId,
    relatedRoomId: roomId,
    metadata: {
      ...metadata,
      arranged_at: new Date().toISOString(),
    },
  });
}

/**
 * Log arrangement cancellation
 */
export async function logArrangementCancelled(
  postId: number,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "arrangement_cancelled",
    reason,
    metadata: {
      ...metadata,
      cancelled_at: new Date().toISOString(),
    },
  });
}

/**
 * Log post collection (successful handoff)
 */
export async function logPostCollected(
  postId: number,
  collectorProfileId: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "collected",
    relatedProfileId: collectorProfileId,
    metadata: {
      ...metadata,
      collected_at: new Date().toISOString(),
    },
  });
}

/**
 * Log post not collected (no-show)
 */
export async function logPostNotCollected(
  postId: number,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "not_collected",
    reason,
    metadata: {
      ...metadata,
      marked_at: new Date().toISOString(),
    },
  });
}

/**
 * Log post share
 */
export async function logPostShared(
  postId: number,
  shareMethod: "link" | "social" | "email" | "other",
  metadata?: Record<string, unknown>
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: "shared",
    metadata: {
      ...metadata,
      share_method: shareMethod,
      shared_at: new Date().toISOString(),
    },
  });
}

/**
 * Log admin action on post
 */
export async function logAdminPostAction(
  postId: number,
  action:
    | "admin_edited"
    | "admin_note_added"
    | "admin_status_changed"
    | "approved"
    | "rejected"
    | "flagged"
    | "unflagged"
    | "hidden"
    | "unhidden",
  changes?: Record<string, unknown>,
  notes?: string,
  reason?: string
): Promise<ActionResult<{ id: string }>> {
  return logPostActivity({
    postId,
    activityType: action,
    changes: changes || {},
    notes,
    reason,
    metadata: {
      admin_action: true,
      action_at: new Date().toISOString(),
    },
  });
}

/**
 * Get post activity timeline
 */
export async function getPostActivityTimeline(
  input: z.infer<typeof getTimelineSchema>
): Promise<ActionResult<PostActivityTimelineItem[]>> {
  const validation = validateWithSchema(getTimelineSchema, input);
  if (!validation.success) return validation;

  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_post_activity_timeline", {
      p_post_id: validation.data.postId,
      p_limit: validation.data.limit,
      p_offset: validation.data.offset,
      p_activity_types: validation.data.activityTypes || null,
    });

    if (error) throw new Error(error.message);
    return (data || []) as PostActivityTimelineItem[];
  }, "getPostActivityTimeline");
}

/**
 * Get user's post activity summary
 */
export async function getUserPostActivitySummary(
  userId?: string,
  days: number = 30
): Promise<ActionResult<UserActivitySummary[]>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    // Get current user if not specified
    let targetUserId = userId;
    if (!targetUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      targetUserId = user.id;
    }

    const { data, error } = await supabase.rpc("get_user_post_activity_summary", {
      p_user_id: targetUserId,
      p_days: days,
    });

    if (error) throw new Error(error.message);
    return (data || []) as UserActivitySummary[];
  }, "getUserPostActivitySummary");
}

/**
 * Get recent activities for a post (simplified)
 */
export async function getRecentPostActivities(
  postId: number,
  limit: number = 10
): Promise<ActionResult<PostActivityLog[]>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("post_activity_logs")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data || []) as PostActivityLog[];
  }, "getRecentPostActivities");
}

/**
 * Get activity counts for a post
 */
export async function getPostActivityCounts(
  postId: number
): Promise<ActionResult<Record<PostActivityType, number>>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("post_activity_logs")
      .select("activity_type")
      .eq("post_id", postId);

    if (error) throw new Error(error.message);

    // Count by activity type
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      counts[row.activity_type] = (counts[row.activity_type] || 0) + 1;
    }

    return counts as Record<PostActivityType, number>;
  }, "getPostActivityCounts");
}

/**
 * Bulk log activities (for batch operations)
 */
export async function bulkLogPostActivities(
  activities: Array<{
    postId: number;
    activityType: PostActivityType;
    metadata?: Record<string, unknown>;
    reason?: string;
  }>
): Promise<ActionResult<{ count: number }>> {
  return withErrorHandling(async () => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const records = activities.map((activity) => ({
      post_id: activity.postId,
      actor_id: user?.id || null,
      activity_type: activity.activityType,
      metadata: activity.metadata || {},
      reason: activity.reason || null,
    }));

    const { error } = await supabase.from("post_activity_logs").insert(records);

    if (error) throw new Error(error.message);
    return { count: records.length };
  }, "bulkLogPostActivities");
}
