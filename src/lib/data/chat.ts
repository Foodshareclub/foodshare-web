/**
 * Chat Data Functions
 * Server-side data fetching for food sharing chat system
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export type ChatRoom = {
  id: string;
  sharer: string;
  requester: string;
  post_id: number;
  last_message: string;
  last_message_sent_by: string;
  last_message_seen_by: string;
  last_message_time: string;
  post_arranged_to: string | null;
  email_to: string;
  // Relations
  posts?: {
    id: number;
    post_name: string;
    images: string[];
    post_type: string;
  };
  profiles?: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string;
  };
  sharer_profile?: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string;
  };
  requester_profile?: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string;
  };
};

export type ChatMessage = {
  id: string;
  room_id: string;
  profile_id: string;
  text: string;
  image: string;
  timestamp: string;
  // Relations
  profiles?: {
    id: string;
    first_name: string;
    second_name: string;
    avatar_url: string;
  };
};

// ============================================================================
// Food Sharing Chat Functions (rooms + room_participants)
// ============================================================================

/**
 * Get all chat rooms for a user (as sharer or requester)
 */
export async function getUserChatRooms(userId: string): Promise<ChatRoom[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      *,
      posts:post_id (id, post_name, images, post_type),
      sharer_profile:sharer (id, first_name, second_name, avatar_url),
      requester_profile:requester (id, first_name, second_name, avatar_url)
    `
    )
    .or(`sharer.eq.${userId},requester.eq.${userId}`)
    .order("last_message_time", { ascending: false });

  if (error) {
    console.error("Error fetching chat rooms:", error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific chat room by ID
 */
export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
      *,
      posts:post_id (id, post_name, images, post_type),
      sharer_profile:sharer (id, first_name, second_name, avatar_url),
      requester_profile:requester (id, first_name, second_name, avatar_url)
    `
    )
    .eq("id", roomId)
    .single();

  if (error) {
    console.error("Error fetching chat room:", error);
    return null;
  }

  return data;
}

/**
 * Get or create a chat room for a post between sharer and requester
 */
export async function getOrCreateChatRoom(
  postId: number,
  sharerId: string,
  requesterId: string
): Promise<ChatRoom | null> {
  const supabase = await createClient();

  // First, check if room exists
  const { data: existingRoom } = await supabase
    .from("rooms")
    .select(
      `
      *,
      posts:post_id (id, post_name, images, post_type),
      sharer_profile:sharer (id, first_name, second_name, avatar_url),
      requester_profile:requester (id, first_name, second_name, avatar_url)
    `
    )
    .eq("post_id", postId)
    .eq("sharer", sharerId)
    .eq("requester", requesterId)
    .single();

  if (existingRoom) {
    return existingRoom;
  }

  // Create new room
  const { data: newRoom, error } = await supabase
    .from("rooms")
    .insert({
      post_id: postId,
      sharer: sharerId,
      requester: requesterId,
      last_message: "",
      last_message_sent_by: requesterId,
      last_message_seen_by: requesterId,
    })
    .select(
      `
      *,
      posts:post_id (id, post_name, images, post_type),
      sharer_profile:sharer (id, first_name, second_name, avatar_url),
      requester_profile:requester (id, first_name, second_name, avatar_url)
    `
    )
    .single();

  if (error) {
    console.error("Error creating chat room:", error);
    return null;
  }

  return newRoom;
}

/**
 * Get messages for a chat room with pagination
 */
export async function getChatMessages(
  roomId: string,
  limit = 50,
  offset = 0
): Promise<ChatMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("room_participants")
    .select(
      `
      *,
      profiles:profile_id (id, first_name, second_name, avatar_url)
    `
    )
    .eq("room_id", roomId)
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  // Return in chronological order for display
  return (data || []).reverse();
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .or(`sharer.eq.${userId},requester.eq.${userId}`)
    .neq("last_message_seen_by", userId)
    .neq("last_message", "");

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// Unified Chat Functions (food sharing only for now)
// ============================================================================

export type UnifiedChatRoom = {
  id: string;
  type: "food";
  title: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  hasUnread: boolean;
  participants: Array<{
    id: string;
    firstName: string;
    secondName: string;
    avatarUrl: string | null;
  }>;
  // Food-specific
  postId?: number;
  postName?: string;
  postImage?: string;
  postType?: string; // Category: food, thing, borrow, wanted, fridge, foodbank, etc.
  // Role info - who is the current user in this chat
  isSharer?: boolean;
  sharerId?: string;
  requesterId?: string;
  // Request acceptance status
  isAccepted?: boolean;
  arrangedAt?: string | null;
};

/**
 * Get all chat rooms for a user
 * Includes role information (sharer vs requester)
 */
export async function getAllUserChats(userId: string): Promise<UnifiedChatRoom[]> {
  const foodRooms = await getUserChatRooms(userId);

  const unifiedRooms: UnifiedChatRoom[] = [];

  // Transform food sharing rooms
  for (const room of foodRooms) {
    const isSharer = room.sharer === userId;
    const otherUser = isSharer ? room.requester_profile : room.sharer_profile;

    unifiedRooms.push({
      id: room.id,
      type: "food",
      title: room.posts?.post_name || "Food Chat",
      lastMessage: room.last_message || null,
      lastMessageTime: room.last_message_time || null,
      hasUnread: room.last_message_seen_by !== userId && !!room.last_message,
      participants: otherUser
        ? [
            {
              id: otherUser.id,
              firstName: otherUser.first_name,
              secondName: otherUser.second_name,
              avatarUrl: otherUser.avatar_url,
            },
          ]
        : [],
      postId: room.post_id,
      postName: room.posts?.post_name,
      postImage: room.posts?.images?.[0],
      postType: room.posts?.post_type || "food", // Category of the listing
      // Role info
      isSharer,
      sharerId: room.sharer,
      requesterId: room.requester,
      // Request acceptance status
      isAccepted: !!room.post_arranged_to,
    });
  }

  // Sort by last message time (most recent first), then by unread status
  unifiedRooms.sort((a, b) => {
    // Unread messages first
    if (a.hasUnread && !b.hasUnread) return -1;
    if (!a.hasUnread && b.hasUnread) return 1;
    // Then by time
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  return unifiedRooms;
}

/**
 * Get total unread message count
 */
export async function getTotalUnreadCount(userId: string): Promise<number> {
  return getUnreadMessageCount(userId);
}
