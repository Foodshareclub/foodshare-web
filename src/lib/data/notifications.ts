/**
 * Notifications Data Functions
 * Server-side data fetching for the notification system
 */

import { createClient } from "@/lib/supabase/server";

// Re-export types from shared types file for backward compatibility
export type {
  NotificationType,
  UserNotification,
  NotificationPreferences,
} from "@/types/notifications.types";
import type { UserNotification } from "@/types/notifications.types";

// ============================================================================
// Data Functions
// ============================================================================

/**
 * Get notifications for a user with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  } = {}
): Promise<UserNotification[]> {
  const { limit = 20, offset = 0, unreadOnly = false } = options;
  const supabase = await createClient();

  let query = supabase
    .from("user_notifications")
    .select(
      `
      *,
      actor:actor_id (id, first_name, second_name, avatar_url),
      post:post_id (id, post_name, images)
    `
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  return data || [];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get a single notification by ID
 */
export async function getNotification(notificationId: string): Promise<UserNotification | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notifications")
    .select(
      `
      *,
      actor:actor_id (id, first_name, second_name, avatar_url),
      post:post_id (id, post_name, images)
    `
    )
    .eq("id", notificationId)
    .single();

  if (error) {
    console.error("Error fetching notification:", error);
    return null;
  }

  return data;
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching notification preferences:", error);
    return {
      messages: true,
      new_listings: true,
      reservations: true,
    };
  }

  return (
    data?.notification_preferences || {
      messages: true,
      new_listings: true,
      reservations: true,
    }
  );
}
