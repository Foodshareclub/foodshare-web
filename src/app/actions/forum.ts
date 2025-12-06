'use server';

import { createClient } from '@/lib/supabase/server';
import { CACHE_TAGS, invalidateTag } from '@/lib/data/cache-keys';
import type { ForumPost } from '@/api/forumAPI';

// Type for forum comments (defined locally since not exported from data layer)
export interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { name: string; avatar_url: string | null } | null;
}

// Re-export types from API layer
export type { ForumPost } from '@/api/forumAPI';

// Re-export cached data functions from data layer
export { getForumPosts } from '@/lib/data/forum';

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Create a new forum post
 */
export async function createForumPost(
  formData: FormData
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as string,
      author_id: user.id,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);

  return { success: true, id: data.id };
}

/**
 * Update a forum post
 */
export async function updateForumPost(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership
  const { data: post } = await supabase
    .from('forum_posts')
    .select('author_id')
    .eq('id', id)
    .single();

  if (post?.author_id !== user.id) {
    return { success: false, error: 'Not authorized to edit this post' };
  }

  const { error } = await supabase
    .from('forum_posts')
    .update({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);
  invalidateTag(CACHE_TAGS.FORUM_POST(Number(id)));

  return { success: true };
}

/**
 * Delete a forum post
 */
export async function deleteForumPost(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership or admin
  const { data: post } = await supabase
    .from('forum_posts')
    .select('author_id')
    .eq('id', id)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  if (post?.author_id !== user.id && !isAdmin) {
    return { success: false, error: 'Not authorized to delete this post' };
  }

  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);

  return { success: true };
}

/**
 * Add a comment to a forum post
 */
export async function addComment(
  postId: string,
  formData: FormData
): Promise<{ success: boolean; comment?: ForumComment; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      post_id: postId,
      content: formData.get('content') as string,
      author_id: user.id,
    })
    .select(`
      id,
      post_id,
      content,
      created_at,
      author_id,
      author:profiles!author_id(name, avatar_url)
    `)
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM_POST(Number(postId)));
  invalidateTag(CACHE_TAGS.FORUM_COMMENTS(Number(postId)));

  const comment: ForumComment = {
    id: data.id,
    post_id: data.post_id,
    content: data.content,
    created_at: data.created_at,
    author_id: data.author_id,
    author: extractFirst(data.author as Array<{ name: string; avatar_url: string | null }>),
  };

  return { success: true, comment };
}

/**
 * Delete a comment
 * Optimized: Parallel fetch for comment and profile data
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch comment and profile in parallel to avoid waterfall
  const [commentResult, profileResult] = await Promise.all([
    supabase
      .from('forum_comments')
      .select('author_id, post_id')
      .eq('id', commentId)
      .single(),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single(),
  ]);

  const comment = commentResult.data;
  const profile = profileResult.data;
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  if (comment?.author_id !== user.id && !isAdmin) {
    return { success: false, error: 'Not authorized to delete this comment' };
  }

  const { error } = await supabase
    .from('forum_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (comment?.post_id) {
    invalidateTag(CACHE_TAGS.FORUM_POST(Number(comment.post_id)));
    invalidateTag(CACHE_TAGS.FORUM_COMMENTS(Number(comment.post_id)));
  }

  return { success: true };
}

/**
 * Toggle like on a forum post
 */
export async function togglePostLike(
  postId: string
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, isLiked: false, error: 'Not authenticated' };
  }

  // Check if already liked
  const { data: existing } = await supabase
    .from('forum_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    // Remove like
    const { error } = await supabase
      .from('forum_likes')
      .delete()
      .eq('id', existing.id);

    if (error) return { success: false, isLiked: true, error: error.message };

    invalidateTag(CACHE_TAGS.FORUM_POST(Number(postId)));
    return { success: true, isLiked: false };
  } else {
    // Add like
    const { error } = await supabase
      .from('forum_likes')
      .insert({ post_id: postId, user_id: user.id });

    if (error) return { success: false, isLiked: false, error: error.message };

    invalidateTag(CACHE_TAGS.FORUM_POST(Number(postId)));
    return { success: true, isLiked: true };
  }
}
