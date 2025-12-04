/**
 * Chat Store (Zustand)
 * Manages real-time chat state
 * Replaces Redux chat slice
 */

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  RoomType,
  CustomRoomType,
  RoomParticipantsType,
} from "@/api/chatAPI";

// ============================================================================
// Types
// ============================================================================

type RoomCreationStatus = "idle" | "creating" | "created" | "error";
type RoomUpdateStatus = "idle" | "updating" | "updated" | "error";
type FeedbackStatus = "not_written" | "written";

interface ChatState {
  // Real-time channel
  channel: RealtimeChannel | null;
  setChannel: (channel: RealtimeChannel | null) => void;

  // Current room
  currentRoom: RoomType | null;
  setCurrentRoom: (room: RoomType | null) => void;

  // All rooms for current user
  rooms: CustomRoomType[];
  setRooms: (rooms: CustomRoomType[]) => void;
  addRoom: (room: CustomRoomType) => void;
  updateRoomInList: (roomId: string, updates: Partial<CustomRoomType>) => void;

  // Messages in current room
  messages: RoomParticipantsType[];
  setMessages: (messages: RoomParticipantsType[]) => void;
  addMessage: (message: RoomParticipantsType) => void;
  prependMessages: (messages: RoomParticipantsType[]) => void;

  // New message indicator (for real-time)
  newMessage: RoomParticipantsType | null;
  setNewMessage: (message: RoomParticipantsType | null) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Room creation status
  creationStatus: RoomCreationStatus;
  setCreationStatus: (status: RoomCreationStatus) => void;

  // Room update status
  updateStatus: RoomUpdateStatus;
  setUpdateStatus: (status: RoomUpdateStatus) => void;

  // Feedback status
  feedbackStatus: FeedbackStatus;
  setFeedbackStatus: (status: FeedbackStatus) => void;

  // Created room reference
  createdRoom: RoomType | null;
  setCreatedRoom: (room: RoomType | null) => void;

  // Reset
  reset: () => void;
  resetCurrentRoom: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useChatStore = create<ChatState>((set) => ({
  // Channel
  channel: null,
  setChannel: (channel) => set({ channel }),

  // Current room
  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),

  // Rooms list
  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),
  updateRoomInList: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
    })),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({
      messages: [message, ...state.messages],
      newMessage: message,
    })),
  prependMessages: (messages) =>
    set((state) => ({
      messages: [...state.messages, ...messages],
    })),

  // New message
  newMessage: null,
  setNewMessage: (message) => set({ newMessage: message }),

  // Loading
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Creation status
  creationStatus: "idle",
  setCreationStatus: (status) => set({ creationStatus: status }),

  // Update status
  updateStatus: "idle",
  setUpdateStatus: (status) => set({ updateStatus: status }),

  // Feedback status
  feedbackStatus: "not_written",
  setFeedbackStatus: (status) => set({ feedbackStatus: status }),

  // Created room
  createdRoom: null,
  setCreatedRoom: (room) => set({ createdRoom: room }),

  // Reset all state
  reset: () =>
    set({
      channel: null,
      currentRoom: null,
      rooms: [],
      messages: [],
      newMessage: null,
      isLoading: false,
      creationStatus: "idle",
      updateStatus: "idle",
      feedbackStatus: "not_written",
      createdRoom: null,
    }),

  // Reset current room only
  resetCurrentRoom: () =>
    set({
      currentRoom: null,
      messages: [],
      newMessage: null,
    }),
}));

// ============================================================================
// Selectors (pure functions for use with useChatStore)
// ============================================================================

export const selectCurrentRoom = (state: ChatState) => state.currentRoom;
export const selectMessages = (state: ChatState) => state.messages;
export const selectRooms = (state: ChatState) => state.rooms;
export const selectChatLoading = (state: ChatState) => state.isLoading;
export const selectNewMessage = (state: ChatState) => state.newMessage;

// ============================================================================
// Custom Hooks (convenience hooks for common selections)
// ============================================================================

export const useCurrentRoom = () => useChatStore(selectCurrentRoom);
export const useMessages = () => useChatStore(selectMessages);
export const useRooms = () => useChatStore(selectRooms);
export const useChatLoading = () => useChatStore(selectChatLoading);
export const useNewMessage = () => useChatStore(selectNewMessage);
