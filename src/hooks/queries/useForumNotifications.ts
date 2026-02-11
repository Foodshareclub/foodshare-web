/**
 * Forum Notifications React Query Hook
 * Replaces Zustand notification state with server-synced React Query cache
 * Provides optimistic mark-as-read
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ForumNotification } from "@/api/forumAPI";

export const forumNotificationKeys = {
  all: ["forum-notifications"] as const,
  list: (profileId: string) => [...forumNotificationKeys.all, "list", profileId] as const,
  unreadCount: (profileId: string) =>
    [...forumNotificationKeys.all, "unread-count", profileId] as const,
};

async function fetchForumNotifications(profileId: string): Promise<ForumNotification[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("forum_notifications")
    .select(
      `
      *,
      actor:actor_id (id, nickname, first_name, second_name, avatar_url),
      forum:forum_id (id, forum_post_name, slug)
    `
    )
    .eq("recipient_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as ForumNotification[];
}

async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("forum_notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

async function markAllRead(profileId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("forum_notifications")
    .update({ is_read: true })
    .eq("recipient_id", profileId)
    .eq("is_read", false);

  if (error) throw error;
}

export function useForumNotifications(profileId: string | undefined) {
  return useQuery({
    queryKey: forumNotificationKeys.list(profileId ?? ""),
    queryFn: () => fetchForumNotifications(profileId!),
    enabled: !!profileId,
    staleTime: 30_000,
  });
}

export function useForumUnreadCount(profileId: string | undefined) {
  const { data: notifications } = useForumNotifications(profileId);
  return notifications?.filter((n) => !n.is_read).length ?? 0;
}

export function useMarkForumNotificationRead(profileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      const queryKey = forumNotificationKeys.list(profileId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ForumNotification[]>(queryKey);

      // Optimistic update
      queryClient.setQueryData<ForumNotification[]>(queryKey, (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(forumNotificationKeys.list(profileId), context.previous);
      }
    },
  });
}

export function useMarkAllForumNotificationsRead(profileId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllRead(profileId),
    onMutate: async () => {
      const queryKey = forumNotificationKeys.list(profileId);
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<ForumNotification[]>(queryKey);

      queryClient.setQueryData<ForumNotification[]>(queryKey, (old) =>
        old?.map((n) => ({ ...n, is_read: true }))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(forumNotificationKeys.list(profileId), context.previous);
      }
    },
  });
}
