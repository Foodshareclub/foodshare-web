/**
 * Notification Types
 * Shared types for the notification system
 * This file is safe to import from both server and client components
 */

export type NotificationType =
  | "new_message"
  | "post_claimed"
  | "post_arranged"
  | "review_received"
  | "review_reminder"
  | "post_expiring"
  | "nearby_post"
  | "welcome"
  | "system";

export type UserNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  post_id: number | null;
  room_id: string | null;
  review_id: number | null;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Relations
  actor?: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string | null;
  };
  post?: {
    id: number;
    post_name: string;
    images: string[];
  };
};

export type NotificationPreferences = {
  messages: boolean;
  new_listings: boolean;
  reservations: boolean;
};
