"use server";

/**
 * Chat Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper auth checks
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag, invalidatePostActivityCaches } from "@/lib/data/cache-keys";
import { trackEvent } from "@/app/actions/analytics";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { logPostContact, logPostArrangement } from "@/app/actions/post-activity";

// ============================================================================
// Zod Schemas
// ============================================================================

const SendMessageSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  text: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
  image: z.string().url().optional().nullable(),
});

const CreateRoomSchema = z.object({
  postId: z.number().int().positive("Invalid post ID"),
  sharerId: z.string().uuid("Invalid sharer ID"),
});

const WriteReviewSchema = z.object({
  profileId: z.string().uuid("Invalid profile ID"),
  postId: z.number().int().positive("Invalid post ID"),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(2000).optional().default(""),
});

// ============================================================================
// Types
// ============================================================================

export interface RoomResult {
  roomId: string;
}

// ============================================================================
// Helper: Verify Auth
// ============================================================================

async function verifyAuth() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ============================================================================
// Food Sharing Chat Actions
// ============================================================================

/**
 * Send a message in a food sharing chat room
 */
export async function sendFoodChatMessage(formData: FormData): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Parse and validate form data
    const rawData = {
      roomId: formData.get("roomId") as string,
      text: formData.get("text") as string,
      image: formData.get("image") as string | null,
    };

    const validated = SendMessageSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    // Insert message
    const { error: messageError } = await supabase.from("room_participants").insert({
      room_id: validated.data.roomId,
      profile_id: user.id,
      text: validated.data.text.trim(),
      image: validated.data.image || null,
    });

    if (messageError) {
      console.error("Failed to send message:", messageError);
      return serverActionError(messageError.message, "DATABASE_ERROR");
    }

    // Update room with last message info
    await supabase
      .from("rooms")
      .update({
        last_message: validated.data.text.trim(),
        last_message_sent_by: user.id,
        last_message_seen_by: user.id,
        last_message_time: new Date().toISOString(),
      })
      .eq("id", validated.data.roomId);

    // Invalidate cache
    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(validated.data.roomId));
    invalidateTag(CACHE_TAGS.CHAT_MESSAGES(validated.data.roomId));

    return successVoid();
  } catch (error) {
    console.error("Failed to send message:", error);
    return serverActionError("Failed to send message", "UNKNOWN_ERROR");
  }
}

/**
 * Mark food chat room as read
 */
export async function markFoodChatAsRead(roomId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!roomId || !z.string().uuid().safeParse(roomId).success) {
      return serverActionError("Invalid room ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    const { error } = await supabase
      .from("rooms")
      .update({ last_message_seen_by: user.id })
      .eq("id", roomId);

    if (error) {
      console.error("Failed to mark as read:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(roomId));

    return successVoid();
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return serverActionError("Failed to mark as read", "UNKNOWN_ERROR");
  }
}

/**
 * Create a new food sharing chat room
 * Prevents users from chatting with themselves or requesting their own posts
 */
export async function createFoodChatRoom(
  postId: number,
  sharerId: string
): Promise<ServerActionResult<RoomResult>> {
  try {
    // Validate inputs
    const validated = CreateRoomSchema.safeParse({ postId, sharerId });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Prevent self-chat: user cannot chat with themselves
    if (user.id === validated.data.sharerId) {
      return serverActionError(
        "You cannot chat with yourself about your own listing",
        "VALIDATION_ERROR"
      );
    }

    // Verify the post belongs to the sharer (prevent requesting own posts)
    const { data: post } = await supabase
      .from("posts")
      .select("profile_id")
      .eq("id", validated.data.postId)
      .single();

    if (post && post.profile_id === user.id) {
      return serverActionError("You cannot request your own listing", "VALIDATION_ERROR");
    }

    // Check if room already exists
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("post_id", validated.data.postId)
      .eq("sharer", validated.data.sharerId)
      .eq("requester", user.id)
      .single();

    if (existingRoom) {
      return {
        success: true,
        data: { roomId: existingRoom.id },
      };
    }

    // Create new room
    const { data: newRoom, error } = await supabase
      .from("rooms")
      .insert({
        post_id: validated.data.postId,
        sharer: validated.data.sharerId,
        requester: user.id,
        last_message: "",
        last_message_sent_by: user.id,
        last_message_seen_by: user.id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create room:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.CHATS);
    invalidatePostActivityCaches(validated.data.postId, user.id);

    // Log post contact activity
    await logPostContact(validated.data.postId, newRoom.id, {
      sharer_id: validated.data.sharerId,
      requester_id: user.id,
    });

    // Track analytics
    await trackEvent("Food Requested", {
      postId: validated.data.postId,
      sharerId: validated.data.sharerId,
      requesterId: user.id,
      roomId: newRoom.id,
    });

    return {
      success: true,
      data: { roomId: newRoom.id },
    };
  } catch (error) {
    console.error("Failed to create room:", error);
    return serverActionError("Failed to create chat room", "UNKNOWN_ERROR");
  }
}

/**
 * Update a food sharing chat room
 */
export async function updateRoom(
  roomId: string,
  formData: FormData
): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!roomId || !z.string().uuid().safeParse(roomId).success) {
      return serverActionError("Invalid room ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Build update object from form data
    const updateData: Record<string, unknown> = {};

    const postArrangedTo = formData.get("post_arranged_to");
    if (postArrangedTo) updateData.post_arranged_to = postArrangedTo;

    const postArrangedAt = formData.get("post_arranged_at");
    if (postArrangedAt) updateData.post_arranged_at = postArrangedAt;

    if (Object.keys(updateData).length === 0) {
      return serverActionError("No update data provided", "VALIDATION_ERROR");
    }

    const { error } = await supabase.from("rooms").update(updateData).eq("id", roomId);

    if (error) {
      console.error("Failed to update room:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(roomId));

    // Track if food was arranged
    if (updateData.post_arranged_to) {
      // Get post_id from room for activity logging
      const { data: roomData } = await supabase
        .from("rooms")
        .select("post_id")
        .eq("id", roomId)
        .single();

      if (roomData?.post_id) {
        await logPostArrangement(roomData.post_id, updateData.post_arranged_to as string, roomId);
        invalidatePostActivityCaches(roomData.post_id, user.id);
      }

      await trackEvent("Food Arranged", {
        roomId,
        arrangedTo: updateData.post_arranged_to,
      });
    }

    return successVoid();
  } catch (error) {
    console.error("Failed to update room:", error);
    return serverActionError("Failed to update room", "UNKNOWN_ERROR");
  }
}

/**
 * Write a review for a food sharing exchange
 */
export async function writeReview(formData: FormData): Promise<ServerActionResult<void>> {
  try {
    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Parse and validate form data
    const rawData = {
      profileId: formData.get("profile_id") as string,
      postId: Number(formData.get("post_id")),
      rating: Number(formData.get("reviewed_rating")),
      feedback: (formData.get("feedback") as string) || "",
    };

    const validated = WriteReviewSchema.safeParse(rawData);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    // Prevent self-review
    if (validated.data.profileId === user.id) {
      return serverActionError("You cannot review yourself", "VALIDATION_ERROR");
    }

    const { error } = await supabase.from("reviews").insert({
      profile_id: validated.data.profileId,
      post_id: validated.data.postId,
      reviewed_rating: validated.data.rating,
      feedback: validated.data.feedback,
      reviewer_id: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        return serverActionError("You have already reviewed this exchange", "CONFLICT");
      }
      console.error("Failed to write review:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PROFILE(validated.data.profileId));
    revalidatePath("/profile");

    // Track analytics
    await trackEvent("Review Left", {
      postId: validated.data.postId,
      rating: validated.data.rating,
      reviewerId: user.id,
      targetProfileId: validated.data.profileId,
    });

    return successVoid();
  } catch (error) {
    console.error("Failed to write review:", error);
    return serverActionError("Failed to submit review", "UNKNOWN_ERROR");
  }
}

/**
 * Delete a chat room (soft delete by archiving)
 */
export async function archiveChatRoom(roomId: string): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!roomId || !z.string().uuid().safeParse(roomId).success) {
      return serverActionError("Invalid room ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Verify user is part of the room
    const { data: room } = await supabase
      .from("rooms")
      .select("sharer, requester")
      .eq("id", roomId)
      .single();

    if (!room) {
      return serverActionError("Chat room not found", "NOT_FOUND");
    }

    if (room.sharer !== user.id && room.requester !== user.id) {
      return serverActionError("You are not part of this chat", "FORBIDDEN");
    }

    const { error } = await supabase
      .from("rooms")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) {
      console.error("Failed to archive room:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(roomId));

    return successVoid();
  } catch (error) {
    console.error("Failed to archive room:", error);
    return serverActionError("Failed to archive chat room", "UNKNOWN_ERROR");
  }
}
