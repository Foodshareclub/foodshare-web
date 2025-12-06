/**
 * Forum Data Layer
 *
 * Server-side data fetching functions for forum posts, categories, and tags.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from 'next/cache';
import { createCachedClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';
import type { ForumPost, ForumCategory, ForumTag } from '@/api/forumAPI';

// ============================================================================
// Constants
// ============================================================================

export const FORUM_LIMITS = {
  POSTS: 100,
  TRENDING: 5,
  LEADERBOARD: 5,
  RECENT_ACTIVITY: 5,
  POPULAR_TAGS: 20,
} as const;

export const SCORE_WEIGHTS = {
  POST: 10,
  LIKE: 5,
  COMMENT: 2,
} as const;

// ============================================================================
// Types
// ============================================================================

export type SortOption = 'latest' | 'hot' | 'top' | 'unanswered';

export interface ForumStats {
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  postsToday: number;
}

export interface LeaderboardUser {
  id: string;
  nickname?: string;
  first_name?: string;
  second_name?: string;
  avatar_url?: string;
  postCount: number;
  likesReceived: number;
  commentsCount: number;
  score: number;
}

export interface ForumPageData {
  posts: ForumPost[];
  categories: ForumCategory[];
  tags: ForumTag[];
  stats: ForumStats;
  leaderboard: LeaderboardUser[];
  trendingPosts: ForumPost[];
  recentActivity: ForumPost[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate user score based on activity
 */
export function calculateScore(posts: number, likes: number, comments: number): number {
  return posts * SCORE_WEIGHTS.POST + likes * SCORE_WEIGHTS.LIKE + comments * SCORE_WEIGHTS.COMMENT;
}

/**
 * Compute leaderboard from posts
 */
export function computeLeaderboard(posts: ForumPost[], limit = FORUM_LIMITS.LEADERBOARD): LeaderboardUser[] {
  const userMap = new Map<string, LeaderboardUser>();

  posts.forEach((post) => {
    if (!post.profile_id || !post.profiles) return;

    const existing = userMap.get(post.profile_id);
    const likes = post.forum_likes_counter || 0;
    const comments = Number(post.forum_comments_counter) || 0;

    if (existing) {
      existing.postCount += 1;
      existing.likesReceived += likes;
      existing.commentsCount += comments;
      existing.score = calculateScore(existing.postCount, existing.likesReceived, existing.commentsCount);
    } else {
      userMap.set(post.profile_id, {
        id: post.profiles.id,
        nickname: post.profiles.nickname,
        first_name: post.profiles.first_name,
        second_name: post.profiles.second_name,
        avatar_url: post.profiles.avatar_url,
        postCount: 1,
        likesReceived: likes,
        commentsCount: comments,
        score: calculateScore(1, likes, comments),
      });
    }
  });

  return Array.from(userMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get trending posts by engagement score
 */
export function getTrendingPosts(posts: ForumPost[], limit = FORUM_LIMITS.TRENDING): ForumPost[] {
  return [...posts]
    .sort((a, b) => {
      const scoreA = (a.views_count || 0) + (a.forum_likes_counter || 0) * 3;
      const scoreB = (b.views_count || 0) + (b.forum_likes_counter || 0) * 3;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Get recent activity posts
 */
export function getRecentActivityPosts(posts: ForumPost[], limit = FORUM_LIMITS.RECENT_ACTIVITY): ForumPost[] {
  return [...posts]
    .sort((a, b) => new Date(b.forum_post_created_at).getTime() - new Date(a.forum_post_created_at).getTime())
    .slice(0, limit);
}

/**
 * Calculate forum stats from posts
 */
export function calculateStats(posts: ForumPost[]): ForumStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const postsToday = posts.filter((p) => new Date(p.forum_post_created_at) >= today).length;
  const totalComments = posts.reduce((acc, p) => acc + (Number(p.forum_comments_counter) || 0), 0);
  const activeUsers = new Set(posts.map((p) => p.profile_id).filter(Boolean)).size;

  return {
    totalPosts: posts.length,
    totalComments,
    activeUsers,
    postsToday,
  };
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get forum posts with relations
 */
export const getForumPosts = unstable_cache(
  async (options?: { categoryId?: number; sortBy?: SortOption; limit?: number }): Promise<ForumPost[]> => {
    const supabase = createCachedClient();
    const limit = options?.limit ?? FORUM_LIMITS.POSTS;

    let query = supabase
      .from('forum')
      .select(
        `*,
        profiles!forum_profile_id_profiles_fkey (id, nickname, first_name, second_name, avatar_url),
        forum_categories!forum_category_id_fkey (*),
        forum_post_tags (forum_tags (*))`
      )
      .eq('forum_published', true);

    // Filter by category
    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId);
    }

    // Sorting
    switch (options?.sortBy) {
      case 'hot':
        query = query.order('hot_score', { ascending: false });
        break;
      case 'top':
        query = query.order('forum_likes_counter', { ascending: false });
        break;
      case 'unanswered':
        query = query.eq('post_type', 'question').is('best_answer_id', null);
        query = query.order('forum_post_created_at', { ascending: false });
        break;
      default:
        query = query.order('last_activity_at', { ascending: false, nullsFirst: false });
    }

    // Pinned posts first
    query = query.order('is_pinned', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch forum posts:', error);
      throw new Error(`Failed to fetch forum posts: ${error.message}`);
    }

    return (data ?? []) as ForumPost[];
  },
  ['forum-posts-v2'],
  {
    revalidate: CACHE_DURATIONS.FORUM,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get active forum categories
 */
export const getForumCategories = unstable_cache(
  async (): Promise<ForumCategory[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch forum categories:', error);
      throw new Error(`Failed to fetch forum categories: ${error.message}`);
    }

    return (data ?? []) as ForumCategory[];
  },
  ['forum-categories'],
  {
    revalidate: CACHE_DURATIONS.LONG,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get popular forum tags
 */
export const getForumTags = unstable_cache(
  async (limit = FORUM_LIMITS.POPULAR_TAGS): Promise<ForumTag[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('forum_tags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch forum tags:', error);
      throw new Error(`Failed to fetch forum tags: ${error.message}`);
    }

    return (data ?? []) as ForumTag[];
  },
  ['forum-tags'],
  {
    revalidate: CACHE_DURATIONS.LONG,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get all forum page data in parallel
 */
export async function getForumPageData(options?: {
  categoryId?: number;
  sortBy?: SortOption;
}): Promise<ForumPageData> {
  const [posts, categories, tags] = await Promise.all([
    getForumPosts(options),
    getForumCategories(),
    getForumTags(),
  ]);

  const stats = calculateStats(posts);
  const leaderboard = computeLeaderboard(posts);
  const trendingPosts = getTrendingPosts(posts);
  const recentActivity = getRecentActivityPosts(posts);

  return {
    posts,
    categories,
    tags,
    stats,
    leaderboard,
    trendingPosts,
    recentActivity,
  };
}
