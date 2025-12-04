/**
 * Chat Queries (TanStack Query)
 * Handles chat data fetching and mutations
 * Works with Zustand store for real-time state
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import {
  chatAPI,
  type RoomType,
  type CustomRoomType,
  type RoomParticipantsType,
  type PayloadForGEtRoom,
  type ReviewsType,
} from "@/api/chatAPI";
import { useChatStore } from "@/store/zustand/useChatStore";

// ============================================================================
// Query Keys
// ============================================================================

export const chatKeys = {
  all: ["chat"] as const,
  rooms: () => [...chatKeys.all, "rooms"] as const,
  room: (params: PayloadForGEtRoom) => [...chatKeys.all, "room", params] as const,
  roomById: (id: string) => [...chatKeys.all, "room", id] as const,
  messages: (roomId: string) => [...chatKeys.all, "messages", roomId] as const,
  availability: (userId: string, postId: string) =>
    [...chatKeys.all, "availability", userId, postId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all rooms for current user
 */
export function useRooms(userId: string | undefined) {
  const setRooms = useChatStore((state) => state.setRooms);

  const query = useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await chatAPI.getAllRoomsForCurrentUser(userId);
      if (error) throw error;
      return (data ?? []) as CustomRoomType[];
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.data) {
      setRooms(query.data);
    }
  }, [query.data, setRooms]);

  return query;
}

/**
 * Get specific room
 */
export function useRoom(params: PayloadForGEtRoom | null) {
  const setCurrentRoom = useChatStore((state) => state.setCurrentRoom);

  const query = useQuery({
    queryKey: chatKeys.room(params ?? { sharerId: "", requesterId: "", postId: "" }),
    queryFn: async () => {
      if (!params) return null;
      const { data, error } = await chatAPI.getRoom(params);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!params,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.data) {
      setCurrentRoom(query.data);
    }
  }, [query.data, setCurrentRoom]);

  return query;
}

/**
 * Get messages for a room
 */
export function useMessages(roomId: string | undefined) {
  const setMessages = useChatStore((state) => state.setMessages);

  const query = useQuery({
    queryKey: chatKeys.messages(roomId ?? ""),
    queryFn: async () => {
      if (!roomId) return [];
      const { data, error } = await chatAPI.getAllMessagesInRoomParticipantsFromOneRoom(roomId);
      if (error) throw error;
      return (data ?? []) as RoomParticipantsType[];
    },
    enabled: !!roomId,
    staleTime: 0, // Always fetch fresh messages
    refetchInterval: false, // We use real-time for updates
  });

  // Sync to Zustand store
  useEffect(() => {
    if (query.data) {
      setMessages(query.data);
    }
  }, [query.data, setMessages]);

  return query;
}

/**
 * Check if room exists between users for a post
 */
export function useRoomAvailability(userId: string | undefined, postId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.availability(userId ?? "", postId ?? ""),
    queryFn: async () => {
      if (!userId || !postId) return { exists: false, room: null };
      const { data, error } = await chatAPI.checkRoomAvailability(userId, postId);
      if (error) throw error;
      const room = data?.[0];
      return { exists: !!room, room: room ?? null };
    },
    enabled: !!userId && !!postId,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new chat room
 */
export function useCreateRoom() {
  const queryClient = useQueryClient();
  const { setCreatedRoom, setCreationStatus } = useChatStore();

  return useMutation({
    mutationFn: async (room: Partial<RoomType>) => {
      setCreationStatus("creating");
      const { data, error } = await chatAPI.createRoom(room);
      if (error) throw error;
      // chatAPI.createRoom uses .single() so data is RoomType, not array
      // The API type annotation is incorrect - cast through unknown
      return data as unknown as RoomType;
    },
    onSuccess: (data) => {
      setCreatedRoom(data);
      setCreationStatus("created");
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
    onError: () => {
      setCreationStatus("error");
    },
  });
}

/**
 * Send a message in a room
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const addMessage = useChatStore((state) => state.addMessage);

  return useMutation({
    mutationFn: async (message: RoomParticipantsType) => {
      const { error } = await chatAPI.creatPostInRoom(message);
      if (error) throw error;
      return message;
    },
    onSuccess: (message) => {
      // Optimistically add to store (real-time will also add it)
      addMessage(message);
      // Update room's last message
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
  });
}

/**
 * Update room (e.g., last message)
 */
export function useUpdateRoom() {
  const queryClient = useQueryClient();
  const { setUpdateStatus, updateRoomInList } = useChatStore();

  return useMutation({
    mutationFn: async (room: Partial<RoomType> & { id: string }) => {
      setUpdateStatus("updating");
      const { error } = await chatAPI.updateRoom(room);
      if (error) throw error;
      return room;
    },
    onSuccess: (room) => {
      setUpdateStatus("updated");
      updateRoomInList(room.id, room);
      queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
    },
    onError: () => {
      setUpdateStatus("error");
    },
  });
}

/**
 * Write a review/feedback
 */
export function useWriteReview() {
  const setFeedbackStatus = useChatStore((state) => state.setFeedbackStatus);

  return useMutation({
    mutationFn: async (review: Partial<ReviewsType>) => {
      const { error } = await chatAPI.writeReview(review);
      if (error) throw error;
      return review;
    },
    onSuccess: () => {
      setFeedbackStatus("written");
    },
  });
}

// ============================================================================
// Real-time Hook
// ============================================================================

/**
 * Subscribe to real-time chat updates
 */
export function useChatRealtime(roomId: string | undefined) {
  const { setChannel, addMessage, channel } = useChatStore();

  useEffect(() => {
    if (!roomId) return;

    // Set up real-time subscription
    const newChannel = chatAPI.listenChannel((newMessage) => {
      // Only add if it's for the current room
      if (newMessage.room_id === roomId) {
        addMessage(newMessage);
      }
    });

    setChannel(newChannel);

    // Cleanup
    return () => {
      if (newChannel) {
        chatAPI.removeChannel(newChannel);
        setChannel(null);
      }
    };
  }, [roomId, setChannel, addMessage]);

  return { channel };
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined chat hook for a specific room
 */
export function useChat(roomId: string | undefined, userId: string | undefined) {
  const messages = useMessages(roomId);
  const rooms = useRooms(userId);
  useChatRealtime(roomId);

  const sendMessage = useSendMessage();
  const updateRoom = useUpdateRoom();
  const createRoom = useCreateRoom();
  const writeReview = useWriteReview();

  // Get from Zustand store for real-time updates
  const storeMessages = useChatStore((state) => state.messages);
  const currentRoom = useChatStore((state) => state.currentRoom);
  const isLoading = useChatStore((state) => state.isLoading);

  return {
    // Data (prefer Zustand for real-time)
    messages: storeMessages,
    currentRoom,
    rooms: rooms.data ?? [],

    // Loading
    isLoading: messages.isLoading || isLoading,
    isRoomsLoading: rooms.isLoading,

    // Mutations
    sendMessage: sendMessage.mutateAsync,
    updateRoom: updateRoom.mutateAsync,
    createRoom: createRoom.mutateAsync,
    writeReview: writeReview.mutateAsync,

    // Mutation states
    isSending: sendMessage.isPending,
    isCreating: createRoom.isPending,

    // Refetch
    refetchMessages: messages.refetch,
    refetchRooms: rooms.refetch,
  };
}
