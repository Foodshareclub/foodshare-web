/**
 * Forum Data Layer
 *
 * Cached data fetching functions for forum posts and comments.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS } from './cache-keys';

// ============================================================================
// Types
// ============================================================================

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  author: {
    name: string;
    avatar_url: string | null;
  } | null;
  comments_count: number;
  likes_count: number;
}

export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: {
    name: string;
    avatar_url: string | null;
  } | null;
}

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get forum posts with optional category filter
 */
export const getForumPosts = unstable_cache(
  async (category?: string): Promise<ForumPost[]> => {
    const supabase = await createClient();

    let query = supabase
      .from('forum_posts')
      .select(`
        id,
        title,
        content,
        category,
        created_at,
        updated_at,
        author_id,
        author:profiles!author_id(name, avatar_url),
        comments:forum_comments(count),
        likes:forum_likes(count)
      `)
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return (data ?? []).map(post => ({
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      created_at: post.created_at,
      updated_at: post.updated_at,
      author_id: post.author_id,
      author: extractFirst(post.author as Array<{ name: string; avatar_url: string | null }>),
      comments_count: (post.comments as unknown as { count: number }[])?.[0]?.count ?? 0,
      likes_count: (post.likes as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
  },
  ['forum-posts'],
  {
    revalidate: CACHE_DURATIONS.FORUM,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get a single forum post by ID
 */
export const getForumPostById = unstable_cache(
  async (id: string): Promise<ForumPost | null> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id,
        title,
        content,
        category,
        created_at,
        updated_at,
        author_id,
        author:profiles!author_id(name, avatar_url),
        comments:forum_comments(count),
        likes:forum_likes(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author_id: data.author_id,
      author: extractFirst(data.author as Array<{ name: string; avatar_url: string | null }>),
      comments_count: (data.comments as unknown as { count: number }[])?.[0]?.count ?? 0,
      likes_count: (data.likes as unknown as { count: number }[])?.[0]?.count ?? 0,
    };
  },
  ['forum-post-by-id'],
  {
    revalidate: CACHE_DURATIONS.FORUM,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get comments for a forum post
 */
export const getForumComments = unstable_cache(
  async (postId: string): Promise<ForumComment[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('forum_comments')
      .select(`
        id,
        post_id,
        content,
        created_at,
        author_id,
        author:profiles!author_id(name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []).map(comment => ({
      id: comment.id,
      post_id: comment.post_id,
      content: comment.content,
      created_at: comment.created_at,
      author_id: comment.author_id,
      author: extractFirst(comment.author as Array<{ name: string; avatar_url: string | null }>),
    }));
  },
  ['forum-comments'],
  {
    revalidate: CACHE_DURATIONS.FORUM,
    tags: [CACHE_TAGS.FORUM],
  }
);

/**
 * Get forum post with comments (combined fetch)
 */
export async function getForumPostWithComments(id: string): Promise<{
  post: ForumPost | null;
  comments: ForumComment[];
}> {
  const [post, comments] = await Promise.all([
    getForumPostById(id),
    getForumComments(id),
  ]);

  return { post, comments };
}
