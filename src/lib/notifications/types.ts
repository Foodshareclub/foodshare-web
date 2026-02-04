/**
 * Notification Types
 *
 * Shared types for the unified notification system.
 * These match the backend api-v1-notifications types.
 */

export type NotificationType =
  | "new_message"
  | "listing_favorited"
  | "listing_expired"
  | "arrangement_confirmed"
  | "arrangement_cancelled"
  | "arrangement_completed"
  | "challenge_complete"
  | "challenge_reminder"
  | "review_received"
  | "review_reminder"
  | "system_announcement"
  | "moderation_warning"
  | "account_security"
  | "welcome"
  | "verification"
  | "password_reset"
  | "digest";

export type NotificationChannel = "push" | "email" | "sms" | "in_app";

export type PriorityLevel = "critical" | "high" | "normal" | "low";

export type NotificationCategory =
  | "posts"
  | "forum"
  | "challenges"
  | "comments"
  | "chats"
  | "social"
  | "system"
  | "marketing";
