/**
 * Challenges Data Layer
 *
 * Cached data fetching functions for challenges.
 * Fetches from the `challenges` table (not posts).
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import type { InitialProductStateType } from "@/types/product.types";

// ============================================================================
// Types
// ============================================================================

export interface Challenge {
  id: number;
  challenge_title: string;
  challenge_description: string;
  challenge_image: string;
  challenge_difficulty: string;
  challenge_action: string;
  challenge_score: string | number; // numeric type from Supabase
  challenge_views: string | number; // numeric type from Supabase
  challenge_likes_counter: number;
  challenged_people: string | number; // numeric type from Supabase
  challenge_published: boolean;
  challenge_created_at: string;
  challenge_updated_at: string;
  profile_id: string;
}

/**
 * Transform challenge data to match InitialProductStateType for compatibility
 * with existing ProductGrid and HomeClient components.
 * Handles numeric fields that Supabase returns as strings.
 */
function transformChallengeToProduct(challenge: Challenge): InitialProductStateType {
  return {
    id: challenge.id,
    post_name: challenge.challenge_title || "",
    post_description: challenge.challenge_description || "",
    images: challenge.challenge_image ? [challenge.challenge_image] : [],
    post_type: "challenge",
    post_views: Number(challenge.challenge_views) || 0,
    post_like_counter: Number(challenge.challenge_likes_counter) || 0,
    profile_id: challenge.profile_id,
    created_at: challenge.challenge_created_at,
    is_active: challenge.challenge_published,
    is_arranged: false,
    post_address: "",
    post_stripped_address: challenge.challenge_difficulty || "",
    available_hours: "",
    condition: challenge.challenge_difficulty || "",
    transportation: "",
    location: null as unknown as InitialProductStateType["location"],
    five_star: null,
    four_star: null,
  };
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Pagination parameters for lazy loading
 */
export interface ChallengesPaginationParams {
  page?: number;
  limit?: number;
  difficulty?: string;
}

/**
 * Paginated response type
 */
export interface PaginatedChallengesResponse {
  data: InitialProductStateType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Challenge stats type
 */
export interface ChallengeStats {
  totalChallenges: number;
  totalParticipants: number;
  totalXpEarned: number;
}

/**
 * Get challenge community stats with caching
 */
export async function getChallengeStats(): Promise<ChallengeStats> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("challenge_score, challenged_people, challenge_likes_counter")
    .eq("challenge_published", true);

  if (error) throw new Error(error.message);

  const challenges = data ?? [];

  // Calculate totals
  const totalChallenges = challenges.length;
  const totalParticipants = challenges.reduce(
    (sum, c) => sum + (Number(c.challenged_people) || 0),
    0
  );
  // XP earned = sum of (score * participants who completed)
  const totalXpEarned = challenges.reduce(
    (sum, c) => sum + (Number(c.challenge_score) || 0) * (Number(c.challenged_people) || 0),
    0
  );

  return { totalChallenges, totalParticipants, totalXpEarned };
}

/**
 * Get all published challenges with caching
 * Returns data transformed to InitialProductStateType for component compatibility
 */
export async function getChallenges(): Promise<InitialProductStateType[]> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenge_published", true)
    .order("challenge_created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(transformChallengeToProduct);
}

/**
 * Get paginated challenges with lazy loading support
 * Optimized for infinite scroll and deck loading
 */
export async function getChallengesPaginated(
  params: ChallengesPaginationParams = {}
): Promise<PaginatedChallengesResponse> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES);

  const { page = 1, limit = 12, difficulty } = params;
  const offset = (page - 1) * limit;

  const supabase = createCachedClient();

  // Build query
  let query = supabase
    .from("challenges")
    .select("*", { count: "exact" })
    .eq("challenge_published", true);

  // Add difficulty filter if provided
  if (difficulty && difficulty !== "all") {
    query = query.eq("challenge_difficulty", difficulty);
  }

  // Add pagination and ordering
  const { data, error, count } = await query
    .order("challenge_created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data ?? []).map(transformChallengeToProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get single challenge by ID with caching
 */
export async function getChallengeById(challengeId: number): Promise<Challenge | null> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES, CACHE_TAGS.CHALLENGE(challengeId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data;
}

/**
 * Get challenges by difficulty
 */
export async function getChallengesByDifficulty(difficulty: string): Promise<Challenge[]> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenge_published", true)
    .eq("challenge_difficulty", difficulty)
    .order("challenge_created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get challenges by user ID
 */
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES, CACHE_TAGS.USER_CHALLENGES(userId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("profile_id", userId)
    .order("challenge_created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get popular challenges (by views or likes)
 */
export async function getPopularChallenges(limit: number = 10): Promise<Challenge[]> {
  'use cache';
  cacheLife('challenges');
  cacheTag(CACHE_TAGS.CHALLENGES);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("challenge_published", true)
    .order("challenge_views", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
