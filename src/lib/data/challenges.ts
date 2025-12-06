/**
 * Challenges Data Layer
 *
 * Cached data fetching functions for challenges.
 * Fetches from the `challenges` table (not posts).
 */

import { unstable_cache } from 'next/cache';
import { createCachedClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';
import type { InitialProductStateType } from '@/types/product.types';

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
    post_name: challenge.challenge_title || '',
    post_description: challenge.challenge_description || '',
    images: challenge.challenge_image ? [challenge.challenge_image] : [],
    post_type: 'challenge',
    post_views: Number(challenge.challenge_views) || 0,
    post_like_counter: Number(challenge.challenge_likes_counter) || 0,
    profile_id: challenge.profile_id,
    created_at: challenge.challenge_created_at,
    is_active: challenge.challenge_published,
    is_arranged: false,
    post_address: '',
    post_stripped_address: challenge.challenge_difficulty || '',
    available_hours: '',
    condition: challenge.challenge_difficulty || '',
    transportation: '',
    location: null as unknown as InitialProductStateType['location'],
    five_star: null,
    four_star: null,
  };
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get all published challenges with caching
 * Returns data transformed to InitialProductStateType for component compatibility
 */
export const getChallenges = unstable_cache(
  async (): Promise<InitialProductStateType[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenge_published', true)
      .order('challenge_created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(transformChallengeToProduct);
  },
  ['challenges'],
  {
    revalidate: CACHE_DURATIONS.CHALLENGES,
    tags: [CACHE_TAGS.CHALLENGES],
  }
);

/**
 * Get single challenge by ID with caching
 */
export async function getChallengeById(challengeId: number): Promise<Challenge | null> {
  return unstable_cache(
    async (): Promise<Challenge | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message);
      }
      return data;
    },
    [`challenge-${challengeId}`],
    {
      revalidate: CACHE_DURATIONS.CHALLENGE_DETAIL,
      tags: [CACHE_TAGS.CHALLENGES, CACHE_TAGS.CHALLENGE(challengeId)],
    }
  )();
}

/**
 * Get challenges by difficulty
 */
export async function getChallengesByDifficulty(difficulty: string): Promise<Challenge[]> {
  return unstable_cache(
    async (): Promise<Challenge[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('challenge_published', true)
        .eq('challenge_difficulty', difficulty)
        .order('challenge_created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`challenges-difficulty-${difficulty}`],
    {
      revalidate: CACHE_DURATIONS.CHALLENGES,
      tags: [CACHE_TAGS.CHALLENGES],
    }
  )();
}

/**
 * Get challenges by user ID
 */
export async function getUserChallenges(userId: string): Promise<Challenge[]> {
  return unstable_cache(
    async (): Promise<Challenge[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('profile_id', userId)
        .order('challenge_created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`user-challenges-${userId}`],
    {
      revalidate: CACHE_DURATIONS.CHALLENGES,
      tags: [CACHE_TAGS.CHALLENGES, CACHE_TAGS.USER_CHALLENGES(userId)],
    }
  )();
}

/**
 * Get popular challenges (by views or likes)
 */
export const getPopularChallenges = unstable_cache(
  async (limit: number = 10): Promise<Challenge[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('challenge_published', true)
      .order('challenge_views', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['popular-challenges'],
  {
    revalidate: CACHE_DURATIONS.CHALLENGES,
    tags: [CACHE_TAGS.CHALLENGES],
  }
);
