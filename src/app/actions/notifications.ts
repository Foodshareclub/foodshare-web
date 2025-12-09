"use server";

/**
 * Notification Server Actions
 * Mutations for the notification system
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag, getNotificationTags } from "@/lib/data/cache-keys";
import type { NotificationType } from "@/types/notifications.types";

// ============================================================================
// Mark as Read Actions
// ============================================================================

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  if (!notificationId) {
    return { error: "Notification ID is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
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
    console.error("Error marking notification as read:", error);
    return { error: "Failed to mark notification as read" };
  }

  // Invalidate cache
  getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

  return { success: true };
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
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
    console.error("Error marking all notifications as read:", error);
    return { error: "Failed to mark notifications as read" };
  }

  // Invalidate cache
  getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

  return { success: true };
}

// ============================================================================
// Delete Actions
// ============================================================================

/**
 * Delete a single notification
 */
export async function deleteNotification(notificationId: string) {
  if (!notificationId) {
    return { error: "Notification ID is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  if (error) {
    console.error("Error deleting notification:", error);
    return { error: "Failed to delete notification" };
  }

  // Invalidate cache
  getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

  return { success: true };
}

/**
 * Delete all read notifications for the current user
 */
export async function deleteReadNotifications() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("user_notifications")
    .delete()
    .eq("recipient_id", user.id)
    .eq("is_read", true);

  if (error) {
    console.error("Error deleting read notifications:", error);
    return { error: "Failed to delete notifications" };
  }

  // Invalidate cache
  getNotificationTags(user.id).forEach((tag) => invalidateTag(tag));

  return { success: true };
}

// ============================================================================
// Create Notification (Internal use / Edge Functions)
// ============================================================================

/**
 * Create a notification for a user
 * Used internally by triggers and edge functions
 */
export async function createNotification(params: {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  postId?: number;
  roomId?: string;
  reviewId?: number;
  data?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("user_notifications").insert({
    recipient_id: params.recipientId,
    actor_id: params.actorId || null,
    type: params.type,
    title: params.title,
    body: params.body || null,
    post_id: params.postId || null,
    room_id: params.roomId || null,
    review_id: params.reviewId || null,
    data: params.data || {},
  });

  if (error) {
    console.error("Error creating notification:", error);
    return { error: "Failed to create notification" };
  }

  // Invalidate cache for recipient
  getNotificationTags(params.recipientId).forEach((tag) => invalidateTag(tag));

  return { success: true };
}

// ============================================================================
// Preferences Actions
// ============================================================================

/**
 * Update notification preferences for the current user
 */
export async function updateNotificationPreferences(preferences: {
  messages?: boolean;
  new_listings?: boolean;
  reservations?: boolean;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Get current preferences
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const currentPrefs = profile?.notification_preferences || {};
  const updatedPrefs = { ...currentPrefs, ...preferences };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: updatedPrefs })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating notification preferences:", error);
    return { error: "Failed to update preferences" };
  }

  invalidateTag(CACHE_TAGS.PROFILE(user.id));

  return { success: true };
}
