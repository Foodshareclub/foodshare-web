/**
 * Food Chat API Client
 *
 * Provides functions for calling the api-v1-chat Edge Function with mode=food.
 * Used for food sharing chat operations (rooms, messages).
 */

import { apiCall, apiGet } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types (match Edge Function schemas)
// =============================================================================

export interface CreateRoomRequest {
  postId: number;
  sharerId: string;
  initialMessage?: string;
}

export interface SendMessageRequest {
  roomId: string;
  text: string;
  image?: string | null;
}

export interface UpdateRoomRequest {
  action: "accept" | "complete" | "archive";
}

// Response types
export interface RoomParticipant {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface RoomPost {
  id: number;
  name: string;
  type: string;
  image: string | null;
}

export interface RoomPostDetail extends RoomPost {
  address: string | null;
  images: string[];
  ownerId: string;
}

export interface RoomResponse {
  id: string;
  postId: number;
  post: RoomPost | null;
  otherParticipant: RoomParticipant | null;
  lastMessage: string;
  lastMessageTime: string | null;
  hasUnread: boolean;
  isArranged: boolean;
  arrangedAt: string | null;
  isSharer: boolean;
  createdAt: string;
}

export interface RoomDetailResponse extends Omit<RoomResponse, "post"> {
  post: RoomPostDetail | null;
}

export interface MessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  image: string | null;
  sender: RoomParticipant | null;
  timestamp: string;
}

export interface RoomWithMessagesResponse {
  room: RoomDetailResponse;
  messages: MessageResponse[];
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-chat";

/**
 * List user's food chat rooms
 */
export async function listRoomsAPI(options?: {
  cursor?: string;
  limit?: number;
}): Promise<ActionResult<{ data: RoomResponse[]; hasMore: boolean }>> {
  const result = await apiGet<{
    data: RoomResponse[];
    pagination: { total: number; hasMore: boolean };
  }>(ENDPOINT, {
    mode: "food",
    cursor: options?.cursor,
    limit: options?.limit,
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      data: result.data.data,
      hasMore: result.data.pagination?.hasMore ?? false,
    },
  };
}

/**
 * Get room with messages
 */
export async function getRoomAPI(
  roomId: string,
  options?: { limit?: number }
): Promise<ActionResult<RoomWithMessagesResponse>> {
  return apiGet<RoomWithMessagesResponse>(ENDPOINT, {
    mode: "food",
    roomId,
    limit: options?.limit,
  });
}

/**
 * Create a food chat room
 */
export async function createRoomAPI(
  input: CreateRoomRequest
): Promise<ActionResult<{ roomId: string; created: boolean }>> {
  return apiCall<{ roomId: string; created: boolean }, CreateRoomRequest>(ENDPOINT, {
    method: "POST",
    body: input,
    query: { mode: "food" },
  });
}

/**
 * Send a message in a food chat room
 */
export async function sendMessageAPI(
  input: SendMessageRequest
): Promise<ActionResult<MessageResponse>> {
  return apiCall<MessageResponse, SendMessageRequest>(ENDPOINT, {
    method: "POST",
    body: input,
    query: { mode: "food", action: "message" },
  });
}

/**
 * Accept a food request (sharer only)
 */
export async function acceptRequestAPI(
  roomId: string
): Promise<ActionResult<{ success: boolean; address: string }>> {
  return apiCall<{ success: boolean; address: string }, UpdateRoomRequest>(ENDPOINT, {
    method: "PUT",
    body: { action: "accept" },
    query: { mode: "food", roomId },
  });
}

/**
 * Complete a food exchange
 */
export async function completeExchangeAPI(
  roomId: string
): Promise<ActionResult<{ success: boolean }>> {
  return apiCall<{ success: boolean }, UpdateRoomRequest>(ENDPOINT, {
    method: "PUT",
    body: { action: "complete" },
    query: { mode: "food", roomId },
  });
}

/**
 * Archive a chat room
 */
export async function archiveRoomAPI(roomId: string): Promise<ActionResult<undefined>> {
  return apiCall<undefined>(ENDPOINT, {
    method: "DELETE",
    query: { mode: "food", roomId },
  });
}
