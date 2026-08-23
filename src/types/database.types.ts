/**
 * Supabase Database Type Definitions
 * Single source of truth across FoodShare monorepo.
 */

import type {
  NotificationCategory,
  NotificationChannel,
  NotificationFrequency,
} from "./notifications.types";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          first_name: string | null;
          second_name: string | null;
          nickname: string | null;
          avatar_url: string | null;
          search_radius_km: number | null;
          role: string | null;
          telegram_id: number | null;
          telegram_username: string | null;
          email_verified: boolean | null;
          onboarding_completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          first_name?: string | null;
          second_name?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          search_radius_km?: number | null;
          role?: string | null;
          telegram_id?: number | null;
          telegram_username?: string | null;
          email_verified?: boolean | null;
          onboarding_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          first_name?: string | null;
          second_name?: string | null;
          nickname?: string | null;
          avatar_url?: string | null;
          search_radius_km?: number | null;
          role?: string | null;
          telegram_id?: number | null;
          telegram_username?: string | null;
          email_verified?: boolean | null;
          onboarding_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      telegram_link_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
      };
      notification_settings: {
        Row: {
          user_id: string;
          push_enabled: boolean;
          email_enabled: boolean;
          sms_enabled: boolean;
          telegram_enabled: boolean;
          phone_number: string | null;
          phone_verified: boolean;
          quiet_hours_enabled: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          timezone: string | null;
          daily_digest_enabled: boolean;
          daily_digest_time: string | null;
          weekly_digest_enabled: boolean;
          weekly_digest_day: number | null;
          dnd_enabled: boolean;
          dnd_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_enabled?: boolean;
          email_enabled?: boolean;
          sms_enabled?: boolean;
          telegram_enabled?: boolean;
          phone_number?: string | null;
          phone_verified?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string | null;
          daily_digest_enabled?: boolean;
          daily_digest_time?: string | null;
          weekly_digest_enabled?: boolean;
          weekly_digest_day?: number | null;
          dnd_enabled?: boolean;
          dnd_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          push_enabled?: boolean;
          email_enabled?: boolean;
          sms_enabled?: boolean;
          telegram_enabled?: boolean;
          phone_number?: string | null;
          phone_verified?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          timezone?: string | null;
          daily_digest_enabled?: boolean;
          daily_digest_time?: string | null;
          weekly_digest_enabled?: boolean;
          weekly_digest_day?: number | null;
          dnd_enabled?: boolean;
          dnd_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          category: NotificationCategory;
          channel: NotificationChannel;
          enabled: boolean;
          frequency: NotificationFrequency;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: NotificationCategory;
          channel: NotificationChannel;
          enabled?: boolean;
          frequency?: NotificationFrequency;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: NotificationCategory;
          channel?: NotificationChannel;
          enabled?: boolean;
          frequency?: NotificationFrequency;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          profile_id: string | null;
          post_name: string;
          post_description: string | null;
          post_address: string | null;
          post_type: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          post_name: string;
          post_description?: string | null;
          post_address?: string | null;
          post_type?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          post_name?: string;
          post_description?: string | null;
          post_address?: string | null;
          post_type?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_telegram_link_token: {
        Args: { p_ttl_minutes?: number };
        Returns: Json;
      };
      claim_telegram_link_token: {
        Args: {
          p_token: string;
          p_telegram_id: number;
          p_username?: string;
          p_first_name?: string;
        };
        Returns: Json;
      };
      unlink_telegram_account: {
        Args: { p_user_id?: string };
        Returns: Json;
      };
      get_notification_preferences: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      update_notification_settings: {
        Args: { p_user_id: string; p_settings: Json };
        Returns: Json;
      };
      update_notification_preference_channel: {
        Args: {
          p_user_id: string;
          p_category: string;
          p_channel: string;
          p_enabled: boolean;
          p_frequency?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      notification_channel: NotificationChannel;
      notification_category: NotificationCategory;
      notification_frequency: NotificationFrequency;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
export type PostUpdate = Database["public"]["Tables"]["posts"]["Update"];
export type TelegramLinkToken = Database["public"]["Tables"]["telegram_link_tokens"]["Row"];
export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
export type NotificationPreference =
  Database["public"]["Tables"]["notification_preferences"]["Row"];
