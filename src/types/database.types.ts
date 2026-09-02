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
          id: number;
          profile_id: string | null;
          post_name: string;
          post_description: string | null;
          post_address: string | null;
          post_stripped_address: string | null;
          post_type: string | null;
          post_slug: string | null;
          post_views: number | null;
          post_like_counter: number | null;
          images: string[] | null;
          is_active: boolean | null;
          is_arranged: boolean | null;
          category_id: number | null;
          tags: string[] | null;
          metadata: Json | null;
          fridge_id: string | null;
          has_pantry: boolean | null;
          available_hours: string | null;
          location_type: string | null;
          condition: string | null;
          pickup_time: string | null;
          quantity: string | null;
          /** pgvector embedding (384-dim) — added in 20260901 migration */
          embedding: number[] | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: number;
          profile_id?: string | null;
          post_name: string;
          post_description?: string | null;
          post_address?: string | null;
          post_stripped_address?: string | null;
          post_type?: string | null;
          post_slug?: string | null;
          post_views?: number | null;
          post_like_counter?: number | null;
          images?: string[] | null;
          is_active?: boolean | null;
          is_arranged?: boolean | null;
          category_id?: number | null;
          tags?: string[] | null;
          metadata?: Json | null;
          fridge_id?: string | null;
          has_pantry?: boolean | null;
          available_hours?: string | null;
          location_type?: string | null;
          condition?: string | null;
          pickup_time?: string | null;
          quantity?: string | null;
          embedding?: number[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: number;
          profile_id?: string | null;
          post_name?: string;
          post_description?: string | null;
          post_address?: string | null;
          post_stripped_address?: string | null;
          post_type?: string | null;
          post_slug?: string | null;
          post_views?: number | null;
          post_like_counter?: number | null;
          images?: string[] | null;
          is_active?: boolean | null;
          is_arranged?: boolean | null;
          category_id?: number | null;
          tags?: string[] | null;
          metadata?: Json | null;
          fridge_id?: string | null;
          has_pantry?: boolean | null;
          available_hours?: string | null;
          location_type?: string | null;
          condition?: string | null;
          pickup_time?: string | null;
          quantity?: string | null;
          embedding?: number[] | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      households: {
        Row: {
          id: string;
          name: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      waste_logs: {
        Row: {
          id: string;
          profile_id: string | null;
          food_name: string;
          category: string | null;
          weight_lbs: number;
          cost_usd: number | null;
          discard_date: string;
          reason: string | null;
          co2_impact_lbs: number | null;
          water_impact_gal: number | null;
          household_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          food_name: string;
          category?: string | null;
          weight_lbs?: number;
          cost_usd?: number | null;
          discard_date?: string;
          reason?: string | null;
          co2_impact_lbs?: number | null;
          water_impact_gal?: number | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          food_name?: string;
          category?: string | null;
          weight_lbs?: number;
          cost_usd?: number | null;
          discard_date?: string;
          reason?: string | null;
          co2_impact_lbs?: number | null;
          water_impact_gal?: number | null;
          household_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      posts_with_location: {
        Row: {
          id: number;
          post_name: string;
          post_description: string | null;
          post_type: string | null;
          post_address: string | null;
          post_stripped_address: string | null;
          post_slug: string | null;
          /** Alias for post_slug — exposed by the view */
          slug: string | null;
          /** Computed "{id}-{post_slug}" canonical identifier */
          canonical_slug: string | null;
          quantity: string | null;
          pickup_time: string | null;
          is_active: boolean | null;
          is_arranged: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          profile_id: string | null;
          images: string[] | null;
          post_views: number | null;
          post_like_counter: number | null;
          /** PostGIS geography column (WKB hex) */
          location: unknown | null;
          /** GeoJSON point computed by ST_AsGeoJSON */
          location_json: Json | null;
          /** Latitude extracted from PostGIS point */
          latitude: number | null;
          /** Longitude extracted from PostGIS point */
          longitude: number | null;
          category_id: number | null;
          tags: string[] | null;
          metadata: Json | null;
          fridge_id: string | null;
          has_pantry: boolean | null;
          available_hours: string | null;
          location_type: string | null;
          condition: string | null;
        };
      };
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
      /** Vector similarity search — added in 20260901 migration */
      match_posts: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<{
          id: number;
          post_name: string;
          post_description: string;
          post_type: string;
          similarity: number;
        }>;
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
export type PostWithLocation = Database["public"]["Views"]["posts_with_location"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdInsert = Database["public"]["Tables"]["households"]["Insert"];
export type WasteLog = Database["public"]["Tables"]["waste_logs"]["Row"];
export type WasteLogInsert = Database["public"]["Tables"]["waste_logs"]["Insert"];
export type WasteLogUpdate = Database["public"]["Tables"]["waste_logs"]["Update"];
export type TelegramLinkToken = Database["public"]["Tables"]["telegram_link_tokens"]["Row"];
export type NotificationSettings = Database["public"]["Tables"]["notification_settings"]["Row"];
export type NotificationPreference =
  Database["public"]["Tables"]["notification_preferences"]["Row"];
