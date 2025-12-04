'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

/**
 * Get forum posts with optional category filter
 */
export async function getForumPosts(category?: string): Promise<ForumPost[]> {
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
}

/**
 * Get a single forum post with comments
 */
export async function getForumPost(id: string): Promise<{
  post: ForumPost | null;
  comments: ForumComment[];
}> {
  const supabase = await createClient();

  const { data: postData, error: postError } = await supabase
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

  if (postError) {
    if (postError.code === 'PGRST116') return { post: null, comments: [] };
    throw new Error(postError.message);
  }

  const { data: commentsData } = await supabase
    .from('forum_comments')
    .select(`
      id,
      post_id,
      content,
      created_at,
      author_id,
      author:profiles!author_id(name, avatar_url)
    `)
    .eq('post_id', id)
    .order('created_at', { ascending: true });

  const post: ForumPost = {
    id: postData.id,
    title: postData.title,
    content: postData.content,
    category: postData.category,
    created_at: postData.created_at,
    updated_at: postData.updated_at,
    author_id: postData.author_id,
    author: extractFirst(postData.author as Array<{ name: string; avatar_url: string | null }>),
    comments_count: (postData.comments as unknown as { count: number }[])?.[0]?.count ?? 0,
    likes_count: (postData.likes as unknown as { count: number }[])?.[0]?.count ?? 0,
  };

  const comments: ForumComment[] = (commentsData ?? []).map(comment => ({
    id: comment.id,
    post_id: comment.post_id,
    content: comment.content,
    created_at: comment.created_at,
    author_id: comment.author_id,
    author: extractFirst(comment.author as Array<{ name: string; avatar_url: string | null }>),
  }));

  return { post, comments };
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

  revalidatePath('/forum');

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

  revalidatePath('/forum');
  revalidatePath(`/forum/${id}`);

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

  revalidatePath('/forum');

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

  revalidatePath(`/forum/${postId}`);

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
 */
export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get comment to verify ownership and get post_id
  const { data: comment } = await supabase
    .from('forum_comments')
    .select('author_id, post_id')
    .eq('id', commentId)
    .single();

  // Check if admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

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
    revalidatePath(`/forum/${comment.post_id}`);
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

    revalidatePath(`/forum/${postId}`);
    return { success: true, isLiked: false };
  } else {
    // Add like
    const { error } = await supabase
      .from('forum_likes')
      .insert({ post_id: postId, user_id: user.id });

    if (error) return { success: false, isLiked: false, error: error.message };

    revalidatePath(`/forum/${postId}`);
    return { success: true, isLiked: true };
  }
}
