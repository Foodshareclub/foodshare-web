import { supabase } from "@/lib/supabase/client";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

// ============================================================================
// Types
// ============================================================================

export type ForumPostType = "discussion" | "question" | "announcement" | "guide";

export type ForumCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  posts_count: number;
  created_at: string;
  updated_at: string;
};

export type ForumTag = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  usage_count: number;
  created_at: string;
};

export type ForumAuthor = {
  id: string;
  nickname: string;
  first_name: string;
  second_name: string;
  avatar_url: string;
};

export type ForumPost = {
  id: number;
  profile_id: string;
  forum_post_name: string | null;
  forum_post_description: string | null;
  forum_post_image: string | null;
  forum_comments_counter: number | null;
  forum_likes_counter: number;
  forum_published: boolean;
  forum_post_created_at: string;
  forum_post_updated_at: string;
  category_id: number | null;
  slug: string | null;
  views_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_edited: boolean;
  is_featured: boolean;
  last_activity_at: string | null;
  reactions_count: Record<string, number>;
  reports_count: number;
  post_type: ForumPostType;
  best_answer_id: number | null;
  rich_content: Record<string, unknown> | null;
  hot_score: number;
  // Joined relations
  profiles?: ForumAuthor;
  forum_categories?: ForumCategory;
  forum_post_tags?: Array<{ forum_tags: ForumTag }>;
  comments?: ForumComment[];
};

export type ForumComment = {
  id: number;
  forum_id: number | null;
  user_id: string;
  comment: string | null;
  comment_created_at: string;
  parent_id: number | null;
  depth: number;
  is_edited: boolean;
  updated_at: string | null;
  likes_count: number;
  replies_count: number;
  reports_count: number;
  is_best_answer: boolean;
  is_pinned: boolean;
  rich_content: Record<string, unknown> | null;
  reactions_count: Record<string, number>;
  // Joined relations
  profiles?: ForumAuthor;
  replies?: ForumComment[];
};

export type ForumReaction = {
  id: string;
  forum_id: number;
  profile_id: string;
  reaction_type_id: number;
  created_at: string;
};

export type ReactionType = {
  id: number;
  name: string;
  emoji: string;
  sort_order: number;
};

export type ForumBookmark = {
  id: number;
  profile_id: string;
  forum_id: number;
  created_at: string;
  collection_id: string | null;
  notes: string | null;
  reminder_at: string | null;
  tags: string[] | null;
};

export type ForumUserStats = {
  profile_id: string;
  posts_count: number;
  comments_count: number;
  reactions_received: number;
  helpful_count: number;
  reputation_score: number;
  trust_level: number;
  followers_count: number;
  following_count: number;
  joined_forum_at: string;
  last_post_at: string | null;
  last_comment_at: string | null;
};

export type ForumNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  forum_id: number | null;
  comment_id: number | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  // Joined
  actor?: ForumAuthor;
  forum?: Pick<ForumPost, "id" | "forum_post_name" | "slug">;
};

export type ForumPoll = {
  id: string;
  forum_id: number;
  question: string;
  poll_type: "single" | "multiple";
  ends_at: string | null;
  is_anonymous: boolean;
  show_results_before_vote: boolean;
  total_votes: number;
  created_at: string;
  forum_poll_options?: ForumPollOption[];
};

export type ForumPollOption = {
  id: string;
  poll_id: string;
  option_text: string;
  votes_count: number;
  sort_order: number;
};

export type ForumSubscription = {
  id: string;
  profile_id: string;
  forum_id: number | null;
  category_id: number | null;
  notify_on_reply: boolean;
  notify_on_mention: boolean;
  notify_on_reaction: boolean;
  email_notifications: boolean;
  created_at: string;
};

// ============================================================================
// API Functions
// ============================================================================

export const forumAPI = {
  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  getCategories(): PromiseLike<PostgrestSingleResponse<ForumCategory[]>> {
    return supabase
      .from("forum_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
  },

  getCategoryBySlug(slug: string): PromiseLike<PostgrestSingleResponse<ForumCategory>> {
    return supabase.from("forum_categories").select("*").eq("slug", slug).single();
  },

  // --------------------------------------------------------------------------
  // Tags
  // --------------------------------------------------------------------------
  getTags(): PromiseLike<PostgrestSingleResponse<ForumTag[]>> {
    return supabase.from("forum_tags").select("*").order("usage_count", { ascending: false });
  },

  getPopularTags(limit: number = 10): PromiseLike<PostgrestSingleResponse<ForumTag[]>> {
    return supabase
      .from("forum_tags")
      .select("*")
      .order("usage_count", { ascending: false })
      .limit(limit);
  },

  // --------------------------------------------------------------------------
  // Posts
  // --------------------------------------------------------------------------
  getPosts(options?: {
    categoryId?: number;
    categorySlug?: string;
    tagId?: number;
    postType?: ForumPostType;
    sortBy?: "latest" | "hot" | "top" | "unanswered";
    limit?: number;
    offset?: number;
  }): PromiseLike<PostgrestSingleResponse<ForumPost[]>> {
    let query = supabase
      .from("forum")
      .select(
        `
        *,
        profiles:profile_id (id, nickname, first_name, second_name, avatar_url),
        forum_categories:category_id (*),
        forum_post_tags (forum_tags (*))
      `
      )
      .eq("forum_published", true);

    // Filter by category
    if (options?.categoryId) {
      query = query.eq("category_id", options.categoryId);
    }

    // Filter by post type
    if (options?.postType) {
      query = query.eq("post_type", options.postType);
    }

    // Filter unanswered questions
    if (options?.sortBy === "unanswered") {
      query = query.eq("post_type", "question").is("best_answer_id", null);
    }

    // Sorting
    switch (options?.sortBy) {
      case "hot":
        query = query.order("hot_score", { ascending: false });
        break;
      case "top":
        query = query.order("forum_likes_counter", { ascending: false });
        break;
      default:
        query = query.order("last_activity_at", {
          ascending: false,
          nullsFirst: false,
        });
    }

    // Pinned posts first
    query = query.order("is_pinned", { ascending: false });

    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options?.limit || 20) - 1);
    }

    return query;
  },

  getPostBySlug(slug: string): PromiseLike<PostgrestSingleResponse<ForumPost>> {
    return supabase
      .from("forum")
      .select(
        `
        *,
        profiles:profile_id (id, nickname, first_name, second_name, avatar_url),
        forum_categories:category_id (*),
        forum_post_tags (forum_tags (*))
      `
      )
      .eq("slug", slug)
      .single();
  },

  getPostById(id: number): PromiseLike<PostgrestSingleResponse<ForumPost>> {
    return supabase
      .from("forum")
      .select(
        `
        *,
        profiles:profile_id (id, nickname, first_name, second_name, avatar_url),
        forum_categories:category_id (*),
        forum_post_tags (forum_tags (*))
      `
      )
      .eq("id", id)
      .single();
  },

  createPost(post: {
    profile_id: string;
    forum_post_name: string;
    forum_post_description: string;
    forum_post_image?: string;
    category_id: number;
    post_type?: ForumPostType;
    slug?: string;
    rich_content?: Record<string, unknown>;
  }): PromiseLike<PostgrestSingleResponse<ForumPost>> {
    const slug =
      post.slug ||
      post.forum_post_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now();

    return supabase
      .from("forum")
      .insert({
        ...post,
        slug,
        post_type: post.post_type || "discussion",
      })
      .select()
      .single();
  },

  updatePost(
    id: number,
    updates: Partial<{
      forum_post_name: string;
      forum_post_description: string;
      forum_post_image: string;
      category_id: number;
      post_type: ForumPostType;
      rich_content: Record<string, unknown>;
      is_edited: boolean;
    }>
  ): PromiseLike<PostgrestSingleResponse<ForumPost>> {
    return supabase
      .from("forum")
      .update({
        ...updates,
        is_edited: true,
        forum_post_updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
  },

  deletePost(id: number) {
    return supabase.from("forum").delete().eq("id", id);
  },

  // Increment view count
  incrementViewCount(postId: number) {
    return supabase.rpc("increment_forum_views", { post_id: postId });
  },

  // Search posts
  searchPosts(
    query: string,
    options?: { categoryId?: number; limit?: number }
  ): PromiseLike<PostgrestSingleResponse<ForumPost[]>> {
    let searchQuery = supabase
      .from("forum")
      .select(
        `
        *,
        profiles:profile_id (id, nickname, first_name, second_name, avatar_url),
        forum_categories:category_id (*)
      `
      )
      .eq("forum_published", true)
      .textSearch("search_vector", query, { type: "websearch" })
      .order("hot_score", { ascending: false });

    if (options?.categoryId) {
      searchQuery = searchQuery.eq("category_id", options.categoryId);
    }

    if (options?.limit) {
      searchQuery = searchQuery.limit(options.limit);
    }

    return searchQuery;
  },

  // --------------------------------------------------------------------------
  // Comments
  // --------------------------------------------------------------------------
  getComments(
    forumId: number,
    options?: { parentId?: number | null; limit?: number; offset?: number }
  ): PromiseLike<PostgrestSingleResponse<ForumComment[]>> {
    let query = supabase
      .from("comments")
      .select(
        `
        *,
        profiles:user_id (id, nickname, first_name, second_name, avatar_url)
      `
      )
      .eq("forum_id", forumId);

    // Get top-level comments by default
    if (options?.parentId === undefined) {
      query = query.is("parent_id", null);
    } else if (options?.parentId !== null) {
      query = query.eq("parent_id", options.parentId);
    }

    query = query
      .order("is_pinned", { ascending: false })
      .order("is_best_answer", { ascending: false })
      .order("comment_created_at", { ascending: true });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  getCommentReplies(commentId: number): PromiseLike<PostgrestSingleResponse<ForumComment[]>> {
    return supabase
      .from("comments")
      .select(
        `
        *,
        profiles:user_id (id, nickname, first_name, second_name, avatar_url)
      `
      )
      .eq("parent_id", commentId)
      .order("comment_created_at", { ascending: true });
  },

  createComment(comment: {
    forum_id: number;
    user_id: string;
    comment: string;
    parent_id?: number;
    depth?: number;
    rich_content?: Record<string, unknown>;
  }): PromiseLike<PostgrestSingleResponse<ForumComment>> {
    return supabase
      .from("comments")
      .insert({
        ...comment,
        depth: comment.depth || (comment.parent_id ? 1 : 0),
      })
      .select(
        `
        *,
        profiles:user_id (id, nickname, first_name, second_name, avatar_url)
      `
      )
      .single();
  },

  updateComment(
    id: number,
    updates: { comment: string; rich_content?: Record<string, unknown> }
  ): PromiseLike<PostgrestSingleResponse<ForumComment>> {
    return supabase
      .from("comments")
      .update({
        ...updates,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
  },

  deleteComment(id: number) {
    return supabase.from("comments").delete().eq("id", id);
  },

  markBestAnswer(
    postId: number,
    commentId: number
  ): PromiseLike<PostgrestSingleResponse<ForumPost>> {
    // Update the post's best_answer_id
    return supabase
      .from("forum")
      .update({ best_answer_id: commentId })
      .eq("id", postId)
      .select()
      .single();
  },

  // --------------------------------------------------------------------------
  // Reactions
  // --------------------------------------------------------------------------
  getReactionTypes(): PromiseLike<PostgrestSingleResponse<ReactionType[]>> {
    return supabase.from("reaction_types").select("*").order("sort_order", { ascending: true });
  },

  getPostReactions(forumId: number): PromiseLike<PostgrestSingleResponse<ForumReaction[]>> {
    return supabase
      .from("forum_reactions")
      .select("*, profiles:profile_id (id, nickname, avatar_url)")
      .eq("forum_id", forumId);
  },

  addReaction(reaction: { forum_id: number; profile_id: string; reaction_type_id: number }) {
    return supabase.from("forum_reactions").upsert(reaction);
  },

  removeReaction(forumId: number, profileId: string) {
    return supabase
      .from("forum_reactions")
      .delete()
      .eq("forum_id", forumId)
      .eq("profile_id", profileId);
  },

  // Comment reactions
  addCommentReaction(reaction: {
    comment_id: number;
    profile_id: string;
    reaction_type_id: number;
  }) {
    return supabase.from("forum_comment_reactions").upsert(reaction);
  },

  removeCommentReaction(commentId: number, profileId: string) {
    return supabase
      .from("forum_comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("profile_id", profileId);
  },

  // --------------------------------------------------------------------------
  // Bookmarks
  // --------------------------------------------------------------------------
  getUserBookmarks(profileId: string): PromiseLike<PostgrestSingleResponse<ForumBookmark[]>> {
    return supabase
      .from("forum_bookmarks")
      .select(
        `
        *,
        forum:forum_id (id, forum_post_name, slug, forum_post_image, profiles:profile_id (nickname, avatar_url))
      `
      )
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
  },

  addBookmark(bookmark: {
    profile_id: string;
    forum_id: number;
    notes?: string;
    collection_id?: string;
  }) {
    return supabase.from("forum_bookmarks").insert(bookmark);
  },

  removeBookmark(forumId: number, profileId: string) {
    return supabase
      .from("forum_bookmarks")
      .delete()
      .eq("forum_id", forumId)
      .eq("profile_id", profileId);
  },

  isBookmarked(
    forumId: number,
    profileId: string
  ): PromiseLike<PostgrestSingleResponse<ForumBookmark | null>> {
    return supabase
      .from("forum_bookmarks")
      .select("id")
      .eq("forum_id", forumId)
      .eq("profile_id", profileId)
      .maybeSingle();
  },

  // --------------------------------------------------------------------------
  // Subscriptions
  // --------------------------------------------------------------------------
  subscribeToPost(subscription: {
    profile_id: string;
    forum_id: number;
    notify_on_reply?: boolean;
    notify_on_mention?: boolean;
  }) {
    return supabase.from("forum_subscriptions").upsert(subscription);
  },

  unsubscribeFromPost(forumId: number, profileId: string) {
    return supabase
      .from("forum_subscriptions")
      .delete()
      .eq("forum_id", forumId)
      .eq("profile_id", profileId);
  },

  // --------------------------------------------------------------------------
  // User Stats
  // --------------------------------------------------------------------------
  getUserStats(profileId: string): PromiseLike<PostgrestSingleResponse<ForumUserStats>> {
    return supabase.from("forum_user_stats").select("*").eq("profile_id", profileId).single();
  },

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------
  getNotifications(
    profileId: string,
    options?: { unreadOnly?: boolean; limit?: number }
  ): PromiseLike<PostgrestSingleResponse<ForumNotification[]>> {
    let query = supabase
      .from("forum_notifications")
      .select(
        `
        *,
        actor:actor_id (id, nickname, avatar_url),
        forum:forum_id (id, forum_post_name, slug)
      `
      )
      .eq("recipient_id", profileId)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("is_read", false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query;
  },

  markNotificationRead(notificationId: string) {
    return supabase.from("forum_notifications").update({ is_read: true }).eq("id", notificationId);
  },

  markAllNotificationsRead(profileId: string) {
    return supabase
      .from("forum_notifications")
      .update({ is_read: true })
      .eq("recipient_id", profileId)
      .eq("is_read", false);
  },

  // --------------------------------------------------------------------------
  // Polls
  // --------------------------------------------------------------------------
  getPoll(forumId: number): PromiseLike<PostgrestSingleResponse<ForumPoll>> {
    return supabase
      .from("forum_polls")
      .select("*, forum_poll_options (*)")
      .eq("forum_id", forumId)
      .single();
  },

  votePoll(vote: { poll_id: string; option_id: string; profile_id: string }) {
    return supabase.from("forum_poll_votes").insert(vote);
  },

  hasVoted(
    pollId: string,
    profileId: string
  ): PromiseLike<PostgrestSingleResponse<{ id: string } | null>> {
    return supabase
      .from("forum_poll_votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("profile_id", profileId)
      .maybeSingle();
  },

  // --------------------------------------------------------------------------
  // User Follows
  // --------------------------------------------------------------------------
  followUser(followerId: string, followingId: string) {
    return supabase.from("forum_user_follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });
  },

  unfollowUser(followerId: string, followingId: string) {
    return supabase
      .from("forum_user_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
  },

  isFollowing(
    followerId: string,
    followingId: string
  ): PromiseLike<PostgrestSingleResponse<{ id: string } | null>> {
    return supabase
      .from("forum_user_follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
  },

  // --------------------------------------------------------------------------
  // Drafts
  // --------------------------------------------------------------------------
  saveDraft(draft: {
    profile_id: string;
    title?: string;
    description?: string;
    category_id?: number;
    post_type?: ForumPostType;
    rich_content?: Record<string, unknown>;
    image_url?: string;
  }) {
    return supabase.from("forum_drafts").upsert({
      ...draft,
      last_saved_at: new Date().toISOString(),
    });
  },

  getDrafts(profileId: string) {
    return supabase
      .from("forum_drafts")
      .select("*")
      .eq("profile_id", profileId)
      .order("last_saved_at", { ascending: false });
  },

  deleteDraft(draftId: string) {
    return supabase.from("forum_drafts").delete().eq("id", draftId);
  },

  // --------------------------------------------------------------------------
  // Reports
  // --------------------------------------------------------------------------
  reportContent(report: {
    reporter_id: string;
    forum_id?: number;
    comment_id?: number;
    reported_profile_id?: string;
    reason: string;
    description?: string;
  }) {
    return supabase.from("forum_reports").insert(report);
  },
};
