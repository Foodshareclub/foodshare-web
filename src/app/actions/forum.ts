"use server";

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
// Structured logger available for future use
// import { createActionLogger } from "@/lib/structured-logger";

// Type for forum comments (defined locally, not exported from "use server" file)
interface ForumComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { name: string; avatar_url: string | null } | null;
}

// Helper to extract first item from Supabase join array
function extractFirst<T>(data: T[] | T | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/**
 * Create a new forum post (FormData version - legacy)
 */
export async function createForumPost(
  formData: FormData
): Promise<{ success: boolean; id?: number; slug?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const categoryId = formData.get("category") as string;
  const postType = (formData.get("postType") as string) || "discussion";
  const imageUrl = formData.get("imageUrl") as string | null;

  // Generate slug from title
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now();

  const { data, error } = await supabase
    .from("forum")
    .insert({
      profile_id: user.id,
      forum_post_name: title,
      forum_post_description: content,
      category_id:
        categoryId && !Number.isNaN(parseInt(categoryId, 10)) ? parseInt(categoryId, 10) : null,
      post_type: postType,
      forum_post_image: imageUrl || null,
      slug,
      forum_published: true,
    })
    .select("id, slug")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);

  return { success: true, id: data.id, slug: data.slug };
}

/**
 * Create a new forum post - FAST version using Server Action
 * This bypasses the slow browser Supabase client and uses server-side auth
 */
export async function createForumPostFast(data: {
  title: string;
  content: string;
  richContent?: Record<string, unknown>;
  categoryId: number;
  postType: string;
  imageUrl?: string | null;
}): Promise<{ success: boolean; slug?: string; error?: string }> {
  const supabase = await createClient();

  // Server-side auth is FAST (no browser cookie overhead)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Generate slug server-side
  const slug =
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Date.now();

  // Insert WITHOUT .select() for fastest response
  const { error } = await supabase.from("forum").insert({
    profile_id: user.id,
    forum_post_name: data.title,
    forum_post_description: data.content,
    rich_content: data.richContent || null,
    category_id: data.categoryId,
    post_type: data.postType,
    forum_post_image: data.imageUrl || null,
    slug,
    forum_published: true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);

  return { success: true, slug };
}

/**
 * Update a forum post
 */
export async function updateForumPost(
  id: number,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify ownership
  const { data: post } = await supabase.from("forum").select("profile_id").eq("id", id).single();

  if (post?.profile_id !== user.id) {
    return { success: false, error: "Not authorized to edit this post" };
  }

  const { error } = await supabase
    .from("forum")
    .update({
      forum_post_name: formData.get("title") as string,
      forum_post_description: formData.get("content") as string,
      category_id: (() => {
        const catId = formData.get("category") as string | null;
        if (!catId) return undefined;
        const parsed = parseInt(catId, 10);
        return Number.isNaN(parsed) ? undefined : parsed;
      })(),
      is_edited: true,
      forum_post_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM);
  invalidateTag(CACHE_TAGS.FORUM_POST(id));

  return { success: true };
}

/**
 * Delete a forum post
 */
export async function deleteForumPost(id: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify ownership or admin
  const { data: post } = await supabase.from("forum").select("profile_id").eq("id", id).single();

  const { data: userRole } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id)
    .in("roles.name", ["admin", "superadmin"])
    .maybeSingle();

  const isAdmin = !!userRole;

  if (post?.profile_id !== user.id && !isAdmin) {
    return { success: false, error: "Not authorized to delete this post" };
  }

  const { error } = await supabase.from("forum").delete().eq("id", id);

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
  postId: number,
  formData: FormData
): Promise<{ success: boolean; comment?: ForumComment; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      forum_id: postId,
      comment: formData.get("content") as string,
      user_id: user.id,
    })
    .select(
      `
      id,
      forum_id,
      comment,
      comment_created_at,
      user_id,
      profiles:user_id(first_name, second_name, avatar_url)
    `
    )
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  invalidateTag(CACHE_TAGS.FORUM_POST(postId));
  invalidateTag(CACHE_TAGS.FORUM_COMMENTS(postId));

  const comment: ForumComment = {
    id: data.id.toString(),
    post_id: data.forum_id?.toString() || "",
    content: data.comment || "",
    created_at: data.comment_created_at,
    author_id: data.user_id,
    author: extractFirst(
      data.profiles as Array<{ first_name: string; second_name: string; avatar_url: string | null }>
    )
      ? {
          name: `${(data.profiles as { first_name: string; second_name: string }[])?.[0]?.first_name || ""} ${(data.profiles as { first_name: string; second_name: string }[])?.[0]?.second_name || ""}`.trim(),
          avatar_url: (data.profiles as { avatar_url: string | null }[])?.[0]?.avatar_url || null,
        }
      : null,
  };

  return { success: true, comment };
}

/**
 * Delete a comment
 * Optimized: Parallel fetch for comment and profile data
 */
export async function deleteComment(
  commentId: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Fetch comment and profile in parallel to avoid waterfall
  const [commentResult, profileResult] = await Promise.all([
    supabase.from("comments").select("user_id, forum_id").eq("id", commentId).single(),
    supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id)
      .in("roles.name", ["admin", "superadmin"])
      .maybeSingle(),
  ]);

  const comment = commentResult.data;
  const userRole = profileResult.data;
  const isAdmin = !!userRole;

  if (comment?.user_id !== user.id && !isAdmin) {
    return { success: false, error: "Not authorized to delete this comment" };
  }

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  if (comment?.forum_id) {
    invalidateTag(CACHE_TAGS.FORUM_POST(comment.forum_id));
    invalidateTag(CACHE_TAGS.FORUM_COMMENTS(comment.forum_id));
  }

  return { success: true };
}

/**
 * Toggle like on a forum post
 */
export async function toggleForumLike(
  postId: number
): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, isLiked: false, error: "Not authenticated" };
  }

  // Check if already liked
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("forum_id", postId)
    .eq("profile_id", user.id)
    .single();

  if (existing) {
    // Remove like
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);

    if (error) return { success: false, isLiked: true, error: error.message };

    invalidateTag(CACHE_TAGS.FORUM_POST(postId));
    return { success: true, isLiked: false };
  } else {
    // Add like
    const { error } = await supabase
      .from("likes")
      .insert({ forum_id: postId, profile_id: user.id });

    if (error) return { success: false, isLiked: false, error: error.message };

    invalidateTag(CACHE_TAGS.FORUM_POST(postId));
    return { success: true, isLiked: true };
  }
}
