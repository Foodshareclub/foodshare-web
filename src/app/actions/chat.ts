"use server";

/**
 * Chat Server Actions
 * Mutations for food sharing chat system
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";

// ============================================================================
// Food Sharing Chat Actions
// ============================================================================

/**
 * Send a message in a food sharing chat room
 */
export async function sendFoodChatMessage(formData: FormData) {
  const roomId = formData.get("roomId") as string;
  const text = formData.get("text") as string;
  const image = formData.get("image") as string | null;

  if (!roomId || !text?.trim()) {
    return { error: "Room ID and message text are required" };
  }

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Insert message
  const { error: messageError } = await supabase.from("room_participants").insert({
    room_id: roomId,
    profile_id: user.id,
    text: text.trim(),
    image: image || null,
  });

  if (messageError) {
    console.error("Error sending message:", messageError);
    return { error: "Failed to send message" };
  }

  // Update room with last message info
  const { error: roomError } = await supabase
    .from("rooms")
    .update({
      last_message: text.trim(),
      last_message_sent_by: user.id,
      last_message_seen_by: user.id,
      last_message_time: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (roomError) {
    console.error("Error updating room:", roomError);
  }

  // Invalidate cache
  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(roomId));
  invalidateTag(CACHE_TAGS.CHAT_MESSAGES(roomId));

  return { success: true };
}

/**
 * Mark food chat room as read
 */
export async function markFoodChatAsRead(roomId: string) {
  if (!roomId) {
    return { error: "Room ID is required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("rooms")
    .update({ last_message_seen_by: user.id })
    .eq("id", roomId);

  if (error) {
    console.error("Error marking as read:", error);
    return { error: "Failed to mark as read" };
  }

  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(roomId));

  return { success: true };
}

/**
 * Create a new food sharing chat room
 * Prevents users from chatting with themselves or requesting their own posts
 */
export async function createFoodChatRoom(postId: number, sharerId: string) {
  if (!postId || !sharerId) {
    return { error: "Post ID and sharer ID are required" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Not authenticated" };
  }

  // Prevent self-chat: user cannot chat with themselves
  if (user.id === sharerId) {
    return { error: "You cannot chat with yourself about your own listing" };
  }

  // Verify the post belongs to the sharer (prevent requesting own posts)
  const { data: post } = await supabase
    .from("posts")
    .select("profile_id")
    .eq("id", postId)
    .single();

  if (post && post.profile_id === user.id) {
    return { error: "You cannot request your own listing" };
  }

  // Check if room already exists
  const { data: existingRoom } = await supabase
    .from("rooms")
    .select("id")
    .eq("post_id", postId)
    .eq("sharer", sharerId)
    .eq("requester", user.id)
    .single();

  if (existingRoom) {
    return { success: true, roomId: existingRoom.id };
  }

  // Create new room
  const { data: newRoom, error } = await supabase
    .from("rooms")
    .insert({
      post_id: postId,
      sharer: sharerId,
      requester: user.id,
      last_message: "",
      last_message_sent_by: user.id,
      last_message_seen_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating room:", error);
    return { error: "Failed to create chat room" };
  }

  invalidateTag(CACHE_TAGS.CHATS);

  // Track analytics
  await trackEvent("Food Requested", {
    postId,
    sharerId,
    requesterId: user.id,
    roomId: newRoom.id,
  });

  return { success: true, roomId: newRoom.id };
}

/**
 * Update a food sharing chat room
 */
export async function updateRoom(roomId: string, formData: FormData) {
  if (!roomId) {
    return { success: false, error: { message: "Room ID is required" } };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: { message: "Not authenticated" } };
  }

  // Build update object from form data
  const updateData: Record<string, unknown> = {};

  const postArrangedTo = formData.get("post_arranged_to");
  if (postArrangedTo) updateData.post_arranged_to = postArrangedTo;

  const postArrangedAt = formData.get("post_arranged_at");
  if (postArrangedAt) updateData.post_arranged_at = postArrangedAt;

  const { error } = await supabase.from("rooms").update(updateData).eq("id", roomId);

  if (error) {
    console.error("Error updating room:", error);
    return { success: false, error: { message: "Failed to update room" } };
  }

  invalidateTag(CACHE_TAGS.CHATS);
  invalidateTag(CACHE_TAGS.CHAT(roomId));

  // Track if food was arranged
  if (updateData.post_arranged_to) {
    await trackEvent("Food Arranged", {
      roomId,
      arrangedTo: updateData.post_arranged_to,
    });
  }

  return { success: true };
}

/**
 * Write a review for a food sharing exchange
 */
export async function writeReview(formData: FormData) {
  const profileId = formData.get("profile_id") as string;
  const postId = formData.get("post_id") as string;
  const rating = formData.get("reviewed_rating") as string;
  const feedback = formData.get("feedback") as string;

  if (!profileId || !postId || !rating) {
    return { success: false, error: { message: "Profile ID, post ID, and rating are required" } };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: { message: "Not authenticated" } };
  }

  const { error } = await supabase.from("reviews").insert({
    profile_id: profileId,
    post_id: Number(postId),
    reviewed_rating: Number(rating),
    feedback: feedback || "",
    reviewer_id: user.id,
  });

  if (error) {
    console.error("Error writing review:", error);
    return { success: false, error: { message: "Failed to submit review" } };
  }

  invalidateTag(CACHE_TAGS.PROFILES);

  // Track analytics
  await trackEvent("Review Left", {
    postId,
    rating,
    reviewerId: user.id,
    targetProfileId: profileId,
  });

  return { success: true };
}
