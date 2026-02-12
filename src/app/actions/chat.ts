"use server";

/**
 * Chat Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Proper auth checks
 * - Edge Function routing (when enabled)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag, invalidatePostActivityCaches } from "@/lib/data/cache-invalidation";
import { trackEvent } from "@/app/actions/analytics";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { logPostContact, logPostArrangement } from "@/app/actions/post-activity";
import { createRoomAPI, sendMessageAPI } from "@/lib/api/chat";
import { submitReviewAPI, formDataToReviewInput } from "@/lib/api/reviews";

// Feature flags for Edge Function migration
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_CHAT === "true";
const USE_EDGE_FUNCTIONS_FOR_REVIEWS = process.env.USE_EDGE_FUNCTIONS_FOR_REVIEWS === "true";

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

const AcceptRequestSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
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
 *
 * Routes to Edge Function when USE_EDGE_FUNCTIONS_FOR_CHAT is enabled.
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

    // Use Edge Function when enabled
    if (USE_EDGE_FUNCTIONS) {
      const result = await sendMessageAPI({
        roomId: validated.data.roomId,
        text: validated.data.text,
        image: validated.data.image,
      });

      if (result.success) {
        invalidateTag(CACHE_TAGS.CHATS);
        invalidateTag(CACHE_TAGS.CHAT(validated.data.roomId));
        invalidateTag(CACHE_TAGS.CHAT_MESSAGES(validated.data.roomId));
        invalidateTag(CACHE_TAGS.USER_NOTIFICATIONS(user.id));
      }

      return result.success
        ? successVoid()
        : serverActionError(result.error.message, result.error.code);
    }

    // Fallback: Direct Supabase path
    // Verify user is a participant in this room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("sharer, requester")
      .eq("id", validated.data.roomId)
      .single();

    if (roomError || !room) {
      return serverActionError("Chat room not found", "NOT_FOUND");
    }

    if (room.sharer !== user.id && room.requester !== user.id) {
      return serverActionError("You are not a participant in this chat", "FORBIDDEN");
    }

    // Check rate limit (10 messages per minute per room)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: messageCount } = await supabase
      .from("room_participants")
      .select("*", { count: "exact", head: true })
      .eq("room_id", validated.data.roomId)
      .eq("profile_id", user.id)
      .gte("timestamp", oneMinuteAgo);

    if (messageCount && messageCount >= 10) {
      return serverActionError("Too many messages. Please wait a moment.", "RATE_LIMIT");
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
    invalidateTag(CACHE_TAGS.USER_NOTIFICATIONS(user.id));

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
 *
 * Routes to Edge Function when USE_EDGE_FUNCTIONS_FOR_CHAT is enabled.
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

    // Use Edge Function when enabled
    if (USE_EDGE_FUNCTIONS) {
      const result = await createRoomAPI({
        postId: validated.data.postId,
        sharerId: validated.data.sharerId,
      });

      if (result.success) {
        invalidateTag(CACHE_TAGS.CHATS);
        invalidateTag(CACHE_TAGS.USER_NOTIFICATIONS(validated.data.sharerId));
        invalidatePostActivityCaches(validated.data.postId, user.id);

        // Log and track only for new rooms
        if (result.data.created) {
          await logPostContact(validated.data.postId, result.data.roomId, {
            sharer_id: validated.data.sharerId,
            requester_id: user.id,
          });

          await trackEvent("Food Requested", {
            postId: validated.data.postId,
            sharerId: validated.data.sharerId,
            requesterId: user.id,
            roomId: result.data.roomId,
            via: "edge-function",
          });
        }

        return { success: true, data: { roomId: result.data.roomId } };
      }

      return serverActionError(result.error.message, result.error.code);
    }

    // Fallback: Direct Supabase path
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
    invalidateTag(CACHE_TAGS.USER_NOTIFICATIONS(validated.data.sharerId));
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

    // ==========================================================================
    // Edge Function Path (when enabled)
    // ==========================================================================
    if (USE_EDGE_FUNCTIONS_FOR_REVIEWS) {
      const input = formDataToReviewInput(formData);
      const result = await submitReviewAPI(input);

      if (result.success) {
        invalidateTag(CACHE_TAGS.PROFILES);
        invalidateTag(CACHE_TAGS.PROFILE(validated.data.profileId));
        revalidatePath("/profile");

        await trackEvent("Review Left", {
          postId: validated.data.postId,
          rating: validated.data.rating,
          reviewerId: user.id,
          targetProfileId: validated.data.profileId,
        });

        return successVoid();
      }

      return result as ServerActionResult<void>;
    }

    // ==========================================================================
    // Direct Supabase Path (fallback)
    // ==========================================================================

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
 * Accept a food request and share pickup address
 * Only the sharer can accept requests
 */
export async function acceptRequestAndShareAddress(
  roomId: string
): Promise<ServerActionResult<{ address: string }>> {
  try {
    const validated = AcceptRequestSchema.safeParse({ roomId });
    if (!validated.success) {
      return serverActionError(validated.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Get room with post details
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select(
        `
        id, sharer, requester, post_id, post_arranged_to,
        posts:post_id (id, post_name, post_address, profile_id)
      `
      )
      .eq("id", validated.data.roomId)
      .single();

    if (roomError || !room) {
      return serverActionError("Chat room not found", "NOT_FOUND");
    }

    // Verify user is the sharer
    if (room.sharer !== user.id) {
      return serverActionError("Only the food owner can accept requests", "FORBIDDEN");
    }

    // Check if already accepted
    if (room.post_arranged_to) {
      return serverActionError("This request has already been accepted", "CONFLICT");
    }

    const postData = room.posts as
      | { id: number; post_name: string; post_address: string; profile_id: string }[]
      | { id: number; post_name: string; post_address: string; profile_id: string }
      | null;
    const post = Array.isArray(postData) ? postData[0] : postData;
    if (!post) {
      return serverActionError("Post not found", "NOT_FOUND");
    }

    const pickupAddress = post.post_address || "Address not set - please contact the sharer";

    // Update room to mark as arranged
    const { error: updateError } = await supabase
      .from("rooms")
      .update({
        post_arranged_to: room.requester,
        post_arranged_at: new Date().toISOString(),
      })
      .eq("id", validated.data.roomId);

    if (updateError) {
      console.error("Failed to update room:", updateError);
      return serverActionError("Failed to accept request", "DATABASE_ERROR");
    }

    // Send address as a formatted message
    const addressMessage = `🎉 Request Accepted!\n\n📍 Pickup Address:\n${pickupAddress}\n\nPlease arrange a convenient time to collect "${post.post_name}". Thank you for sharing food!`;

    const { error: messageError } = await supabase.from("room_participants").insert({
      room_id: validated.data.roomId,
      profile_id: user.id,
      text: addressMessage,
    });

    if (messageError) {
      console.error("Failed to send address message:", messageError);
      // Don't fail the whole operation if message fails
    }

    // Update room with last message
    await supabase
      .from("rooms")
      .update({
        last_message: addressMessage.substring(0, 100) + "...",
        last_message_sent_by: user.id,
        last_message_seen_by: user.id,
        last_message_time: new Date().toISOString(),
      })
      .eq("id", validated.data.roomId);

    // Log the arrangement
    await logPostArrangement(post.id, room.requester, validated.data.roomId);

    // Invalidate caches
    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(validated.data.roomId));
    invalidateTag(CACHE_TAGS.CHAT_MESSAGES(validated.data.roomId));
    invalidatePostActivityCaches(post.id, user.id);

    // Track analytics
    await trackEvent("Food Request Accepted", {
      roomId: validated.data.roomId,
      postId: post.id,
      sharerId: user.id,
      requesterId: room.requester,
    });

    return {
      success: true,
      data: { address: pickupAddress },
    };
  } catch (error) {
    console.error("Failed to accept request:", error);
    return serverActionError("Failed to accept request", "UNKNOWN_ERROR");
  }
}

/**
 * Mark a food exchange as complete and notify both parties
 */
export async function completeExchange(roomId: string): Promise<ServerActionResult<void>> {
  try {
    if (!roomId || !z.string().uuid().safeParse(roomId).success) {
      return serverActionError("Invalid room ID", "VALIDATION_ERROR");
    }

    const { supabase, user, error: authError } = await verifyAuth();
    if (authError || !supabase || !user) {
      return serverActionError(authError || "Not authenticated", "UNAUTHORIZED");
    }

    // Get room with all details
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select(
        `
        id, sharer, requester, post_id, post_arranged_to,
        posts:post_id (id, post_name, images),
        sharer_profile:sharer (id, first_name, second_name, email),
        requester_profile:requester (id, first_name, second_name, email)
      `
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return serverActionError("Chat room not found", "NOT_FOUND");
    }

    // Verify user is a participant
    if (room.sharer !== user.id && room.requester !== user.id) {
      return serverActionError("You are not a participant in this chat", "FORBIDDEN");
    }

    // Verify request was accepted first
    if (!room.post_arranged_to) {
      return serverActionError("Request must be accepted before completing", "VALIDATION_ERROR");
    }

    const postData = room.posts as
      | { id: number; post_name: string; images: string[] }[]
      | { id: number; post_name: string; images: string[] }
      | null;
    const post = Array.isArray(postData) ? postData[0] : postData;

    type ProfileType = { id: string; first_name: string; second_name: string; email: string };
    const sharerData = room.sharer_profile as ProfileType[] | ProfileType | null;
    const sharerProfile = Array.isArray(sharerData) ? sharerData[0] : sharerData;

    const requesterData = room.requester_profile as ProfileType[] | ProfileType | null;
    const requesterProfile = Array.isArray(requesterData) ? requesterData[0] : requesterData;

    // Mark post as arranged/completed
    if (post) {
      await supabase.from("posts").update({ is_arranged: true }).eq("id", post.id);
    }

    // Send completion message
    const completionMessage =
      "✅ Exchange Complete! Thank you for sharing food and reducing waste. Consider leaving a review to help build trust in the community!";

    await supabase.from("room_participants").insert({
      room_id: roomId,
      profile_id: user.id,
      text: completionMessage,
    });

    // Update room
    await supabase
      .from("rooms")
      .update({
        last_message: completionMessage,
        last_message_sent_by: user.id,
        last_message_seen_by: user.id,
        last_message_time: new Date().toISOString(),
      })
      .eq("id", roomId);

    // Send completion emails to both parties
    if (sharerProfile?.email && requesterProfile?.email && post) {
      // Queue emails (using existing email infrastructure)
      try {
        const { sendExchangeCompletionEmail } = await import("@/app/actions/email");

        // Email to sharer
        await sendExchangeCompletionEmail({
          to: sharerProfile.email,
          recipientName: sharerProfile.first_name,
          otherPartyName: `${requesterProfile.first_name} ${requesterProfile.second_name}`,
          itemName: post.post_name,
          role: "sharer",
          roomId,
        });

        // Email to requester
        await sendExchangeCompletionEmail({
          to: requesterProfile.email,
          recipientName: requesterProfile.first_name,
          otherPartyName: `${sharerProfile.first_name} ${sharerProfile.second_name}`,
          itemName: post.post_name,
          role: "requester",
          roomId,
        });
      } catch (emailError) {
        console.error("Failed to send completion emails:", emailError);
        // Don't fail the whole operation if emails fail
      }
    }

    // Invalidate caches
    invalidateTag(CACHE_TAGS.CHATS);
    invalidateTag(CACHE_TAGS.CHAT(roomId));
    if (post) {
      invalidateTag(CACHE_TAGS.PRODUCTS);
      invalidatePostActivityCaches(post.id, user.id);
    }

    // Track analytics
    await trackEvent("Food Exchange Completed", {
      roomId,
      postId: post?.id,
      sharerId: room.sharer,
      requesterId: room.requester,
      completedBy: user.id,
    });

    return successVoid();
  } catch (error) {
    console.error("Failed to complete exchange:", error);
    return serverActionError("Failed to complete exchange", "UNKNOWN_ERROR");
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
