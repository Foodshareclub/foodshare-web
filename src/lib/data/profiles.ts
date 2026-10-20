import "server-only";

/**
 * Profiles Data Layer
 *
 * Cached data fetching functions for user profiles.
 */

import { serverActionError } from "@/lib/errors";
import type { ServerActionResult } from "@/lib/errors";
import { createCachedClient, createClient } from "@/lib/supabase/server";
import type { PostGISGeography } from "@/types";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";

// ============================================================================
// Types
// ============================================================================

export interface Profile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  nickname: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  search_radius_km: number | null;
  location: PostGISGeography;
  is_active: boolean;
  is_verified: boolean;
  onboarding_completed: boolean;
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
  location: PostGISGeography;
  /**
   * The member's own opt-out. It has always been a column and has always
   * been ignored: the public profile rendered the raw point regardless, so
   * "don't share my location" did nothing at all.
   */
  location_sharing_enabled: boolean;
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

interface UserRoleRow {
  roles: { name: string } | null;
}

interface ProfileIdRow {
  id: string;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * The caller's own profile.
 *
 * Two changes, both forced by `profiles` becoming owner-or-admin readable:
 *
 * - It reads through a **session** client, not the anon one. The own-row policy
 *   is `TO authenticated`, and the anon key carries no JWT, so an anon read
 *   returns nothing at all now.
 * - It selects a column list. `select("*")` returned `verification_code` and
 *   `verification_code_expires_at` — a live email-verification credential — into
 *   the header render on every authenticated page load, and a `*` means any
 *   column added later is included by default.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!userId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,first_name,second_name,nickname,avatar_url,email,phone,birth_date,about_me,search_radius_km," +
        "is_active,is_verified,onboarding_completed,created_time,updated_at,location,language",
    )
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as Profile;
}

/**
 * Get public profile for viewing with caching
 *
 * Reads `profiles_public`, not `profiles`. `profiles` is no longer readable by
 * the anon key at all — the projection is what a visitor's browser is allowed
 * to see, and it is narrower on purpose: no email, phone, birth date or home
 * coordinates, and the location already rounded to an ~11 km cell *in the
 * database* so a scraper cannot recover the exact point either.
 *
 * The column list is still explicit even though the view is already narrow:
 * `select("*")` would silently widen this read the next time someone adds a
 * column to the view.
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  "use cache";
  cacheLife("profiles");
  cacheTag(CACHE_TAGS.PROFILES);
  cacheTag(CACHE_TAGS.PROFILE(userId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("profiles_public")
    .select(
      "id, first_name, second_name, nickname, avatar_url, about_me, location, location_sharing_enabled, created_time",
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
  const supabase = createCachedClient();

  // `reviews` keys the reviewed user as `profile_id` and stores the score in
  // `reviewed_rating`. The three counts are independent, so run them together —
  // but check every error: previously the results were destructured without
  // looking at `error`, so a bad column name surfaced as a confident "0 reviews"
  // rather than a failure.
  const [postsResult, activePostsResult, reviewsResult] = await Promise.all([
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("profile_id", userId),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("profile_id", userId).eq("is_active", true),
    supabase.from("reviews").select("reviewed_rating").eq("profile_id", userId),
  ]);

  for (const [label, result] of [
    ["posts", postsResult],
    ["active posts", activePostsResult],
    ["reviews", reviewsResult],
  ] as const) {
    if (result.error) {
      throw new Error(`Failed to load ${label} for user stats: ${result.error.message}`);
    }
  }

  const ratings = (reviewsResult.data ?? [])
    .map((r: { reviewed_rating: unknown }) => r.reviewed_rating)
    .filter((rating: unknown): rating is number => typeof rating === "number");

  const totalReviews = ratings.length;
  const averageRating =
    totalReviews > 0 ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / totalReviews : 0;

  return {
    totalProducts: postsResult.count ?? 0,
    activeProducts: activePostsResult.count ?? 0,
    totalReviews,
    averageRating: Math.round(averageRating * 10) / 10,
  };
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

  const { data, error } = await supabase.from("user_roles").select("roles!inner(name)").eq("profile_id", userId);

  if (error) return [];

  return ((data ?? []) as UserRoleRow[]).map((r) => r.roles?.name).filter((name: unknown): name is string => !!name);
}

/**
 * Get profile reviews with caching
 */
export async function getProfileReviews(userId: string): Promise<ProfileReview[]> {
  const supabase = createCachedClient();

  // `reviews` has no reviewer column: the author of the reviewed item is the
  // reviewer, reachable via post_id/forum_id. The previous query selected
  // `rating`, `comment` and joined `profiles!reviewer_id` — none of which exist,
  // so it threw on every call.
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      reviewed_rating,
      notes,
      created_at,
      post:posts!reviews_post_id_fkey (author:profiles!posts_profile_id_fkey (first_name, second_name, avatar_url)),
      forum_post:forum!reviews_forum_id_fkey (author:profiles!forum_profile_id_profiles_fkey (first_name, second_name, avatar_url))
    `,
    )
    .eq("profile_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Helper to extract first item from Supabase join array
  const extractFirst = <T>(data: T[] | T | null | undefined): T | null => {
    if (Array.isArray(data)) return data[0] ?? null;
    return data ?? null;
  };

  type ReviewerShape = {
    first_name: string | null;
    second_name: string | null;
    avatar_url: string | null;
  };
  type ReviewRow = {
    id: string | number;
    reviewed_rating: number;
    notes: string;
    created_at: string;
    post: { author: ReviewerShape[] | ReviewerShape | null } | null;
    forum_post: { author: ReviewerShape[] | ReviewerShape | null } | null;
  };

  return ((data ?? []) as unknown as ReviewRow[]).map((review) => {
    const postAuthor = extractFirst(review.post?.author ?? null) as ReviewerShape | null;
    const forumAuthor = extractFirst(review.forum_post?.author ?? null) as ReviewerShape | null;
    return {
      id: String(review.id),
      rating: review.reviewed_rating,
      comment: review.notes,
      created_at: review.created_at,
      reviewer: postAuthor ?? forumAuthor,
    };
  });
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
      `,
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

/**
 * Get popular profile IDs for static generation (ISR)
 */
export async function getPopularProfileIds(limit = 100): Promise<string[]> {
  // Cached, and deliberately not wrapped in try/catch: the directive must be
  // the first statement in the function body, and a `try` above it is not one.
  // The previous version caught and returned `[]`, which turns a database
  // outage into a page that looks like nobody has shared anything — the same
  // failure mode removed from `getAnalyticsSummary`.
  "use cache";
  cacheLife("profiles");
  cacheTag(CACHE_TAGS.PROFILES);

  // The public projection: this runs on the anon key, and `profiles` is now
  // owner-or-admin only.
  const supabase = createCachedClient();
  const { data, error } = await supabase
    .from("profiles_public")
    .select("id")
    .order("created_time", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProfileIdRow[]).map((p) => p.id);
}
