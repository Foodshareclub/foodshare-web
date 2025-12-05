/**
 * Profiles Data Layer
 *
 * Cached data fetching functions for user profiles.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';

// ============================================================================
// Types
// ============================================================================

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  role: string;
  is_volunteer: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  username: string | null;
  avatar_url: string | null;
  about_me: string | null;
  user_location: string | null;
  created_time: string | null;
  role: {
    admin: boolean;
    volunteer: boolean;
    subscriber: boolean;
    organization: boolean;
  } | null;
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
  reviewer: { name: string; avatar_url: string | null } | null;
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
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
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
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, second_name, username, avatar_url, about_me, user_location, created_time, role')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
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
      const supabase = await createClient();

      const [
        { count: totalProducts },
        { count: activeProducts },
        { data: reviews },
      ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('profile_id', userId),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('profile_id', userId).eq('is_active', true),
        supabase.from('reviews').select('rating').eq('reviewed_user_id', userId),
      ]);

      const totalReviews = reviews?.length ?? 0;
      const averageRating = totalReviews > 0
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
 */
export const getVolunteers = unstable_cache(
  async (): Promise<Profile[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_volunteer', true)
      .order('name');

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ['volunteers'],
  {
    revalidate: CACHE_DURATIONS.VOLUNTEERS,
    tags: [CACHE_TAGS.VOLUNTEERS, CACHE_TAGS.PROFILES],
  }
);

/**
 * Get profile reviews with caching
 */
export async function getProfileReviews(userId: string): Promise<ProfileReview[]> {
  return unstable_cache(
    async (): Promise<ProfileReview[]> => {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviewer_id(name, avatar_url)
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Helper to extract first item from Supabase join array
      const extractFirst = <T,>(data: T[] | T | null | undefined): T | null => {
        if (Array.isArray(data)) return data[0] ?? null;
        return data ?? null;
      };

      return (data ?? []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        reviewer: extractFirst(review.reviewer as Array<{ name: string; avatar_url: string | null }>),
      }));
    },
    [`profile-reviews-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PROFILES,
      tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.PROFILE_REVIEWS(userId)],
    }
  )();
}
