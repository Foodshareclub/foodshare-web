/**
 * Notification Domain Types
 * Unified types for the notification system across web, backend, and mobile.
 * Safe to import from server and client components.
 */

export type NotificationChannel = "push" | "email" | "telegram" | "sms" | "in_app";

export type NotificationCategory =
  | "posts"
  | "forum"
  | "challenges"
  | "comments"
  | "chats"
  | "social"
  | "system"
  | "marketing";

export type NotificationFrequency = "instant" | "hourly" | "daily" | "weekly" | "never";

export type NotificationType =
  | "new_message"
  | "post_claimed"
  | "post_arranged"
  | "review_received"
  | "review_reminder"
  | "post_expiring"
  | "nearby_post"
  | "welcome"
  | "verification"
  | "security_alert"
  | "system";

export interface UserNotification {
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
}

export interface QuietHoursSettings {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface DigestSettings {
  daily_enabled: boolean;
  daily_time: string;
  weekly_enabled: boolean;
  weekly_day: number;
}

export interface DndSettings {
  enabled: boolean;
  until: string | null;
}

export interface NotificationGlobalSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  telegram_enabled: boolean;
  telegram_linked: boolean;
  telegram_id: number | null;
  telegram_username: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  quiet_hours: QuietHoursSettings;
  digest: DigestSettings;
  dnd: DndSettings;
}

export interface CategoryChannelPreference {
  enabled: boolean;
  frequency: NotificationFrequency | string;
}

export type CategoryPreferencesMap = Record<string, Record<string, CategoryChannelPreference>>;

export interface FullNotificationPreferencesData {
  settings: NotificationGlobalSettings;
  preferences: CategoryPreferencesMap;
}

export type NotificationPreferences = FullNotificationPreferencesData;

export interface TelegramStatusResult {
  isLinked: boolean;
  telegramUsername: string | null;
  telegramId: number | null;
}

export type TelegramStatus = TelegramStatusResult;

export interface TelegramLinkTokenResult {
  token: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
}
