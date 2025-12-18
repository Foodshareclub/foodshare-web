/**
 * Profiles Data Layer
 *
 * Cached data fetching functions for user profiles.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient, createCachedClient } from "@/lib/supabase/server";

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

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get profile by user ID with caching
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  return unstable_cache(
    async (): Promise<Profile | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw new Error(error.message);
      }

      return data;
    },
    [`profile-by-id-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PROFILES,
      tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE(userId)],
    }
  )();
}

/**
 * Get public profile for viewing with caching
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  return unstable_cache(
    async (): Promise<PublicProfile | null> => {
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
    },
    [`public-profile-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PROFILES,
      tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE(userId)],
    }
  )();
}

/**
 * Get user statistics with caching
 */
export async function getUserStats(userId: string): Promise<ProfileStats> {
  return unstable_cache(
    async (): Promise<ProfileStats> => {
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
          supabase.from("reviews").select("rating").eq("reviewed_user_id", userId),
        ]);

      const totalReviews = reviews?.length ?? 0;
      const averageRating =
        totalReviews > 0
          ? (reviews?.reduce((sum, r) => sum + (r.rating || 0), 0) ?? 0) / totalReviews
          : 0;

      return {
        totalProducts: totalProducts ?? 0,
        activeProducts: activeProducts ?? 0,
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    },
    [`user-stats-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PROFILE_STATS,
      tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE_STATS(userId)],
    }
  )();
}

/**
 * Get volunteers list with caching
 * Uses user_roles table to find users with volunteer role
 */
export const getVolunteers = unstable_cache(
  async (): Promise<Profile[]> => {
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
  },
  ["volunteers"],
  {
    revalidate: CACHE_DURATIONS.VOLUNTEERS,
    tags: [CACHE_TAGS.VOLUNTEERS, CACHE_TAGS.PROFILES],
  }
);

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
  return unstable_cache(
    async (): Promise<ProfileReview[]> => {
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
    },
    [`profile-reviews-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PROFILES,
      tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE_REVIEWS(userId)],
    }
  )();
}
