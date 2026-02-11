/**
 * Profiles Data Layer
 *
 * Cached data fetching functions for user profiles.
 * Uses 'use cache' directive for server-side caching with tag-based invalidation.
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";
import { createClient, createCachedClient } from "@/lib/supabase/server";
import { serverActionError } from "@/lib/errors";
import type { ServerActionResult } from "@/lib/errors";

// ============================================================================
// Types
// ============================================================================

export interface Profile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: unknown | null;
  is_active: boolean;
  created_time: string | null;
  updated_at: string | null;
}

export interface PublicProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  about_me: string | null;
  // PostGIS geography type - can be object with coordinates or string representation
  location: Record<string, unknown> | string | null;
  created_time: string | null;
  // Roles fetched from user_roles junction table
  roles?: string[];
}

export interface ProfileStats {
  totalProducts: number;
  activeProducts: number;
  totalReviews: number;
  averageRating: number;
}

export interface ProfileReview {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface UserAddress {
  profile_id: string;
  address_line_1: string;
  address_line_2: string;
  address_line_3: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  lat: number | null;
  long: number | null;
  generated_full_address: string;
  radius_meters: number | null;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get profile by user ID with caching
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  'use cache';
  cacheLife('profiles');
  cacheTag(CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE(userId));

  const supabase = createCachedClient();

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get public profile for viewing with caching
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  'use cache';
  cacheLife('profiles');
  cacheTag(CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE(userId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, second_name, nickname, avatar_url, about_me, location, created_time"
    )
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data;
}

/**
 * Get user statistics with caching
 */
export async function getUserStats(userId: string): Promise<ProfileStats> {
  'use cache';
  cacheLife('profile-stats');
  cacheTag(CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE_STATS(userId));

  const supabase = createCachedClient();

  const [{ count: totalProducts }, { count: activeProducts }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .eq("is_active", true),
      supabase.from("reviews").select("reviewed_rating").eq("reviewed_user_id", userId),
    ]);

  const totalReviews = reviews?.length ?? 0;
  const averageRating =
    totalReviews > 0
      ? (reviews?.reduce((sum, r) => sum + (r.reviewed_rating || 0), 0) ?? 0) / totalReviews
      : 0;

  return {
    totalProducts: totalProducts ?? 0,
    activeProducts: activeProducts ?? 0,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
  };
}

/**
 * Get volunteers list with caching
 * Uses user_roles table to find users with volunteer role
 */
export async function getVolunteers(): Promise<Profile[]> {
  'use cache';
  cacheLife('long');
  cacheTag(CACHE_TAGS.VOLUNTEERS, CACHE_TAGS.PROFILES);

  const supabase = createCachedClient();

  // Get volunteer profile IDs from user_roles
  const { data: volunteerRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("profile_id, roles!inner(name)")
    .eq("roles.name", "volunteer");

  if (rolesError) throw new Error(rolesError.message);

  const profileIds = (volunteerRoles || []).map((r) => r.profile_id);
  if (profileIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", profileIds)
    .order("first_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Check if a user has a specific role
 */
export async function hasUserRole(userId: string, roleName: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", userId)
    .eq("roles.name", roleName)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

/**
 * Get user roles from user_roles table
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", userId);

  if (error) return [];

  return (data ?? [])
    .map((r) => (r.roles as unknown as { name: string })?.name)
    .filter((name): name is string => !!name);
}

/**
 * Get profile reviews with caching
 */
export async function getProfileReviews(userId: string): Promise<ProfileReview[]> {
  'use cache';
  cacheLife('profiles');
  cacheTag(CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE_REVIEWS(userId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      rating,
      comment,
      created_at,
      reviewer:profiles!reviewer_id(first_name, second_name, avatar_url)
    `
    )
    .eq("reviewed_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Helper to extract first item from Supabase join array
  const extractFirst = <T>(data: T[] | T | null | undefined): T | null => {
    if (Array.isArray(data)) return data[0] ?? null;
    return data ?? null;
  };

  return (data ?? []).map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    created_at: review.created_at,
    reviewer: extractFirst(
      review.reviewer as Array<{
        first_name: string | null;
        second_name: string | null;
        avatar_url: string | null;
      }>
    ),
  }));
}

// ============================================================================
// Auth-dependent Read Functions (not cached - depend on current user session)
// ============================================================================

/**
 * Get current user's profile (not cached - depends on auth)
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  return getProfile(user.id);
}

/**
 * Get current user's address for pre-filling forms
 * Returns the user's saved address from the address table
 */
export async function getUserAddress(): Promise<ServerActionResult<UserAddress | null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return serverActionError("Not authenticated", "UNAUTHORIZED");
    }

    const { data, error } = await supabase
      .from("address")
      .select(
        `
        profile_id,
        address_line_1,
        address_line_2,
        address_line_3,
        city,
        state_province,
        postal_code,
        country,
        lat,
        long,
        generated_full_address,
        radius_meters
      `
      )
      .eq("profile_id", user.id)
      .single();

    if (error) {
      // No address found is not an error - just return null
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      console.error("Failed to fetch user address:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    return { success: true, data: data as UserAddress };
  } catch (error) {
    console.error("Failed to fetch user address:", error);
    return serverActionError("Failed to fetch user address", "UNKNOWN_ERROR");
  }
}
