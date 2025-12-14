"use server";

/**
 * Notification Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper auth checks
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag, getNotificationTags } from "@/lib/data/cache-keys";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import type { NotificationType } from "@/types/notifications.types";

// ============================================================================
// Zod Schemas
// ============================================================================

const CreateNotificationSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  actorId: z.string().uuid().optional().nullable(),
  type: z.string().min(1, "Notification type is required"),
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().max(1000).optional().nullable(),
  postId: z.number().int().positive().optional().nullable(),
  roomId: z.string().uuid().optional().nullable(),
  reviewId: z.number().int().positive().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional().default({}),
});

const NotificationPreferencesSchema = z.object({
  messages: z.boolean().optional(),
  new_listings: z.boolean().optional(),
  reservations: z.boolean().optional(),
});

// ============================================================================
// Helper: Verify Auth
// ============================================================================

async function verifyAuth() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ============================================================================
// Mark as Read Actions
// ============================================================================

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!notificationId || !z.string().uuid().safeParse(notificationId).success) {
      return serverActionError("Invalid notification ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { error } = await supabase
      .from("user_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate cache
    getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

    return successVoid();
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return serverActionError("Failed to mark notification as read", "UNKNOWN_ERROR");
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead(): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { error } = await supabase
      .from("user_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all notifications as read:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate cache
    getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

    return successVoid();
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return serverActionError("Failed to mark all notifications as read", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Delete Actions
// ============================================================================

/**
 * Delete a single notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!notificationId || !z.string().uuid().safeParse(notificationId).success) {
      return serverActionError("Invalid notification ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("Failed to delete notification:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate cache
    getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

    return successVoid();
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return serverActionError("Failed to delete notification", "UNKNOWN_ERROR");
  }
}

/**
 * Delete all read notifications for the current user
 */
export async function deleteReadNotifications(): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("recipient_id", user.id)
      .eq("is_read", true);

    if (error) {
      console.error("Failed to delete read notifications:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate cache
    getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

    return successVoid();
  } catch (error) {
    console.error("Failed to delete read notifications:", error);
    return serverActionError("Failed to delete read notifications", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Create Notification (Internal use / Edge Functions)
// ============================================================================

interface CreateNotificationParams {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  postId?: number | null;
  roomId?: string | null;
  reviewId?: number | null;
  data?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 * Used internally by triggers and edge functions
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = CreateNotificationSchema.safeParse(params);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const supabase = await createClient();

    const { error } = await supabase.from("user_notifications").insert({
      recipient_id: validated.data.recipientId,
      actor_id: validated.data.actorId || null,
      type: validated.data.type,
      title: validated.data.title,
      body: validated.data.body || null,
      post_id: validated.data.postId || null,
      room_id: validated.data.roomId || null,
      review_id: validated.data.reviewId || null,
      data: validated.data.data,
    });

    if (error) {
      console.error("Failed to create notification:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Invalidate cache for recipient
    getNotificationTags(validated.data.recipientId).forEach((tag) => invalidateTag(tag));

    return successVoid();
  } catch (error) {
    console.error("Failed to create notification:", error);
    return serverActionError("Failed to create notification", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// Preferences Actions
// ============================================================================

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(
  preferences: z.infer<typeof NotificationPreferencesSchema>
): Promise<ServerActionResult<void>> {
  try {
    // Validate inputs
    const validated = NotificationPreferencesSchema.safeParse(preferences);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Get current preferences
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user.id)
      .single();

    const currentPrefs = (profile?.notification_preferences as Record<string, unknown>) || {};
    const updatedPrefs = { ...currentPrefs, ...validated.data };

    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: updatedPrefs })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update notification preferences:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.PROFILE(user.id));
    revalidatePath("/settings");

    return successVoid();
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return serverActionError("Failed to update notification preferences", "UNKNOWN_ERROR");
  }
}

/**
 * Get notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<ServerActionResult<number>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { count, error } = await supabase
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to get notification count:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return {
      success: true,
      data: count || 0,
    };
  } catch (error) {
    console.error("Failed to get notification count:", error);
    return serverActionError("Failed to get notification count", "UNKNOWN_ERROR");
  }
}
