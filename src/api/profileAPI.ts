/**
 * Profile API
 * Handles user profile operations (NOT authentication)
 * Auth operations are in authAPI.ts
 *
 * @deprecated This API layer is deprecated for server-side usage.
 * Use @/lib/data/profiles for server-side data fetching instead.
 * This file is kept for backward compatibility with client-side TanStack Query hooks.
 *
 * Migration guide:
 * - Server Components: import { getProfile } from '@/lib/data/profiles'
 * - Server Actions: import { createClient } from '@/lib/supabase/server'
 * - Client (realtime only): Keep using this file
 */

import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type CountryType = {
  continent: string | null;
  id: number;
  iso2: string;
  iso3: string;
  local_name: string | null;
  name: string;
};

export type AddressType = {
  address_line_1: string;
  address_line_2: string;
  address_line_3?: string;
  city: string;
  country: number;
  county: string;
  postal_code: string;
  profile_id: string;
  state_province: string;
};

export type ProfileType = {
  id: string;
  created_time: string;
  updated_at: string | null;
  email?: string;
  first_name: string;
  second_name: string;
  nickname?: string;
  avatar_url: string;
  about_me: string;
  bio?: string;
  birth_date: string;
  phone: string;
  // Location is a PostGIS geography type, stored as unknown
  location?: unknown;
  // Roles fetched from user_roles junction table
  roles?: string[];
  // Preferences stored as JSONB
  dietary_preferences?: Record<string, unknown>;
  notification_preferences?: Record<string, unknown>;
  theme_preferences?: Record<string, unknown>;
  search_radius_km?: number;
  // Status flags
  is_verified?: boolean;
  is_active?: boolean;
  email_verified?: boolean;
  last_seen_at?: string;
  // Social links
  facebook?: string;
  instagram?: string;
  twitter?: string;
  telegram_id?: number;
  // Transportation preference
  transportation?: string;
  // Language preference
  language?: string;
};

// Legacy type alias for backward compatibility
export type AllValuesType = ProfileType;

/**
 * Profile API methods
 * Separated from auth operations for clean architecture
 */
export const profileAPI = {
  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<PostgrestSingleResponse<ProfileType>> {
    return supabase.from("profiles").select("*").eq("id", userId).single();
  },

  /**
   * Get another user's profile (for viewing other users)
   */
  async getAnotherUserProfile(userId: string): Promise<PostgrestSingleResponse<ProfileType>> {
    return supabase.from("profiles").select("*").eq("id", userId).single();
  },

  /**
   * Get multiple profiles by IDs
   */
  async getProfilesByIds(userIds: string[]): Promise<PostgrestSingleResponse<ProfileType[]>> {
    return supabase.from("profiles").select("*").in("id", userIds);
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<ProfileType>) {
    return supabase.from("profiles").upsert(updates);
  },

  /**
   * Get volunteers list (users with volunteer role)
   */
  async getVolunteers(): Promise<PostgrestSingleResponse<ProfileType[]>> {
    return supabase
      .from("profiles")
      .select("*, user_roles!inner(roles!inner(name))")
      .eq("user_roles.roles.name", "volunteer")
      .limit(50);
  },

  /**
   * Get user address
   */
  async getUserAddress(userId: string) {
    return supabase.from("address").select("*").eq("profile_id", userId);
  },

  /**
   * Update user address
   */
  async updateAddress(updates: AddressType) {
    return supabase.from("address").upsert(updates);
  },

  /**
   * Get all countries
   */
  async getAllCountries() {
    return supabase.from("countries").select("*").range(100, 250);
  },
};

// Legacy export for backward compatibility
export const getValue = profileAPI.getProfile;
export const getAnotherUser = profileAPI.getAnotherUserProfile;
export const getVolunteer = profileAPI.getVolunteers;
