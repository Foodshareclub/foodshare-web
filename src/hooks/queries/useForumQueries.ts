/**
 * Forum Queries (TanStack Query)
 * Handles forum data fetching and mutations
 * Works with Zustand store for UI state
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useForumStore } from "@/store/zustand/useForumStore";

// Import forum API (we'll use supabase directly for now)
import { supabase } from "@/lib/supabase/client";
import type {
  ForumPost,
  ForumComment,
  ForumCategory,
  ForumTag,
  ReactionType,
  ForumNotification,
  ForumUserStats,
} from "@/api/forumAPI";

// ============================================================================
// Query Keys
// ============================================================================

export const forumKeys = {
  all: ["forum"] as const,
  posts: () => [...forumKeys.all, "posts"] as const,
  postsList: (filters: Record<string, unknown>) =>
    [...forumKeys.posts(), "list", filters] as const,
  postDetail: (id: number) => [...forumKeys.posts(), "detail", id] as const,
  postBySlug: (slug: string) => [...forumKeys.posts(), "slug", slug] as const,
  comments: (postId: number) => [...forumKeys.all, "comments", postId] as const,
  categories: () => [...forumKeys.all, "categories"] as const,
  tags: () => [...forumKeys.all, "tags"] as const,
  reactionTypes: () => [...forumKeys.all, "reactionTypes"] as const,
  notifications: (userId: string) => [...forumKeys.all, "notifications", userId] as const,
  userStats: (userId: string) => [...forumKeys.all, "userStats", userId] as const,
  search: (query: string) => [...forumKeys.all, "search", query] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get forum categories
 */
export function useForumCategories() {
  return useQuery({
    queryKey: forumKeys.categories(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ForumCategory[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get forum tags
 */
export function useForumTags() {
  return useQuery({
    queryKey: forumKeys.tags(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_tags")
        .select("*")
        .order("usage_count", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ForumTag[];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Get reaction types
 */
export function useReactionTypes() {
  return useQuery({
    queryKey: forumKeys.reactionTypes(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reaction_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ReactionType[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Get forum posts with filters (from Zustand store)
 */
export function useForumPosts() {
  const { filters, offset, setHasMore } = useForumStore();
  const limit = 20;

  return useQuery({
    queryKey: forumKeys.postsList({ ...filters, offset }),
    queryFn: async () => {
      let query = supabase
        .from("forum")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, avatar_url),
          forum_categories:category_id(*),
          forum_post_tags(forum_tags(*))
        `)
        .eq("forum_published", true)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.postType !== "all") {
        query = query.eq("post_type", filters.postType);
      }
      if (filters.searchQuery) {
        query = query.textSearch("forum_post_name", filters.searchQuery);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "popular":
          query = query.order("forum_likes_counter", { ascending: false });
          break;
        case "hot":
          query = query.order("hot_score", { ascending: false });
          break;
        case "unanswered":
          query = query
            .eq("post_type", "question")
            .is("best_answer_id", null)
            .order("forum_post_created_at", { ascending: false });
          break;
        default:
          query = query.order("forum_post_created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Update hasMore
      setHasMore((data?.length ?? 0) === limit);

      return (data ?? []) as ForumPost[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get single post by ID
 */
export function useForumPost(postId: number | undefined) {
  return useQuery({
    queryKey: forumKeys.postDetail(postId ?? 0),
    queryFn: async () => {
      if (!postId) return null;
      const { data, error } = await supabase
        .from("forum")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, avatar_url),
          forum_categories:category_id(*),
          forum_post_tags(forum_tags(*))
        `)
        .eq("id", postId)
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    enabled: !!postId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get post by slug
 */
export function useForumPostBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: forumKeys.postBySlug(slug ?? ""),
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("forum")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, avatar_url),
          forum_categories:category_id(*),
          forum_post_tags(forum_tags(*))
        `)
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    enabled: !!slug,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get comments for a post
 */
export function useForumComments(postId: number | undefined) {
  return useQuery({
    queryKey: forumKeys.comments(postId ?? 0),
    queryFn: async () => {
      if (!postId) return [];
      const { data, error } = await supabase
        .from("forum_comments")
        .select(`
          *,
          profiles:user_id(id, first_name, second_name, avatar_url)
        `)
        .eq("forum_id", postId)
        .order("comment_created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ForumComment[];
    },
    enabled: !!postId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get user notifications
 */
export function useForumNotifications(userId: string | undefined) {
  const setNotifications = useForumStore((state) => state.setNotifications);

  const query = useQuery({
    queryKey: forumKeys.notifications(userId ?? ""),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("forum_notifications")
        .select(`
          *,
          actor:actor_id(id, first_name, second_name, avatar_url),
          forum:forum_id(id, forum_post_name, slug)
        `)
        .eq("recipient_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ForumNotification[];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000,
  });

  // Sync to Zustand
  if (query.data) {
    setNotifications(query.data);
  }

  return query;
}

/**
 * Get user forum stats
 */
export function useForumUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: forumKeys.userStats(userId ?? ""),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("forum_user_stats")
        .select("*")
        .eq("profile_id", userId)
        .single();
      if (error && error.code !== "PGRST116") throw error; // Ignore not found
      return data as ForumUserStats | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a forum post
 */
export function useCreateForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Partial<ForumPost>) => {
      const { data, error } = await supabase
        .from("forum")
        .insert(post)
        .select()
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.posts() });
    },
  });
}

/**
 * Update a forum post
 */
export function useUpdateForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ForumPost> & { id: number }) => {
      const { data, error } = await supabase
        .from("forum")
        .update({ ...updates, is_edited: true })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ForumPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.postDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: forumKeys.posts() });
    },
  });
}

/**
 * Delete a forum post
 */
export function useDeleteForumPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number) => {
      const { error } = await supabase.from("forum").delete().eq("id", postId);
      if (error) throw error;
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.removeQueries({ queryKey: forumKeys.postDetail(postId) });
      queryClient.invalidateQueries({ queryKey: forumKeys.posts() });
    },
  });
}

/**
 * Create a comment
 */
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: Partial<ForumComment>) => {
      const { data, error } = await supabase
        .from("forum_comments")
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data as ForumComment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.comments(data.forum_id!) });
      // Update post comment count
      queryClient.invalidateQueries({ queryKey: forumKeys.postDetail(data.forum_id!) });
    },
  });
}

/**
 * Add reaction to post
 */
export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      reactionTypeId,
    }: {
      postId: number;
      userId: string;
      reactionTypeId: number;
    }) => {
      const { error } = await supabase.from("forum_reactions").insert({
        forum_id: postId,
        profile_id: userId,
        reaction_type_id: reactionTypeId,
      });
      if (error) throw error;
      return { postId, reactionTypeId };
    },
    onMutate: async ({ postId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: forumKeys.postDetail(postId) });
      const previous = queryClient.getQueryData(forumKeys.postDetail(postId));

      queryClient.setQueryData(forumKeys.postDetail(postId), (old: ForumPost | undefined) => {
        if (!old) return old;
        return {
          ...old,
          forum_likes_counter: old.forum_likes_counter + 1,
        };
      });

      return { previous };
    },
    onError: (_, { postId }, context) => {
      queryClient.setQueryData(forumKeys.postDetail(postId), context?.previous);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.postDetail(postId) });
    },
  });
}

/**
 * Remove reaction
 */
export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, userId }: { postId: number; userId: string }) => {
      const { error } = await supabase
        .from("forum_reactions")
        .delete()
        .eq("forum_id", postId)
        .eq("profile_id", userId);
      if (error) throw error;
      return { postId };
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.postDetail(postId) });
    },
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const markRead = useForumStore((state) => state.markNotificationRead);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("forum_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
      return notificationId;
    },
    onSuccess: (id) => {
      markRead(id);
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined forum hook for common operations
 */
export function useForum(userId: string | undefined) {
  const categories = useForumCategories();
  const tags = useForumTags();
  const posts = useForumPosts();
  const notifications = useForumNotifications(userId);

  const createPost = useCreateForumPost();
  const updatePost = useUpdateForumPost();
  const deletePost = useDeleteForumPost();
  const createComment = useCreateComment();
  const addReaction = useAddReaction();

  // Get from Zustand
  const { filters, setFilters, resetFilters, unreadCount } = useForumStore();

  return {
    // Data
    categories: categories.data ?? [],
    tags: tags.data ?? [],
    posts: posts.data ?? [],
    notifications: notifications.data ?? [],
    unreadCount,

    // Filters
    filters,
    setFilters,
    resetFilters,

    // Loading
    isLoading: posts.isLoading,
    isCategoriesLoading: categories.isLoading,

    // Mutations
    createPost: createPost.mutateAsync,
    updatePost: updatePost.mutateAsync,
    deletePost: deletePost.mutateAsync,
    createComment: createComment.mutateAsync,
    addReaction: addReaction.mutateAsync,

    // Mutation states
    isCreating: createPost.isPending,
    isUpdating: updatePost.isPending,

    // Refetch
    refetch: posts.refetch,
  };
}
