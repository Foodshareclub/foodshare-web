/**
 * Profile API
 * Handles user profile operations (NOT authentication)
 * Auth operations are in authAPI.ts
 */

import { supabase } from "@/lib/supabase/client";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

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

export type RoleType = {
  admin: boolean;
  volunteer: boolean;
  subscriber: boolean;
  organization: boolean;
  "fridge-coordinator": boolean;
  "foodbank-coordinator": boolean;
};

export type ProfileType = {
  created_time: string;
  email?: string;
  id: string;
  liked_post: string;
  about_me: string;
  avatar_url: string;
  birth_date: string;
  first_name: string;
  last_name?: string; // Alias for second_name
  phone: string;
  second_name: string;
  updated_at: Date;
  user_address: string;
  user_location: string;
  user_metro_station: string;
  username: string;
  role: RoleType;
  is_volunteer?: boolean; // Derived from role.volunteer
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
      .select("*, user_roles!inner(role_id)")
      .eq("user_roles.role_id", 2) // volunteer role_id = 2
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
