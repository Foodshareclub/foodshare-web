/**
 * Chat Data Functions Tests
 * Unit tests for chat-related data fetching functions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  rooms: [] as Array<Record<string, unknown>>,
  room: null as Record<string, unknown> | null,
  messages: [] as Array<Record<string, unknown>>,
  unreadRooms: [] as Array<{ id: string }>,
  error: null as { message: string; code?: string } | null,
  insertedRoom: null as Record<string, unknown> | null,
};

// Mock Supabase client
const createMockSupabaseClient = () => {
  const createRoomsChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = mock(() => chain);
    chain.eq = mock(() => chain);
    chain.or = mock(() => chain);
    chain.neq = mock(() => chain);
    chain.order = mock(() =>
      Promise.resolve({
        data: mockState.rooms,
        error: mockState.error,
      })
    );
    chain.single = mock(() =>
      Promise.resolve({
        data: mockState.room,
        error: mockState.error,
      })
    );
    chain.then = (resolve: (value: unknown) => void) =>
      resolve({
        data: mockState.unreadRooms,
        error: mockState.error,
      });
    return chain;
  };

  const createMessagesChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = mock(() => chain);
    chain.eq = mock(() => chain);
    chain.order = mock(() => chain);
    chain.range = mock(() =>
      Promise.resolve({
        data: mockState.messages,
        error: mockState.error,
      })
    );
    return chain;
  };

  const createInsertChain = () => {
    const chain: Record<string, unknown> = {};
    chain.insert = mock(() => chain);
    chain.select = mock(() => chain);
    chain.single = mock(() =>
      Promise.resolve({
        data: mockState.insertedRoom,
        error: mockState.error,
      })
    );
    return chain;
  };

  return {
    from: mock((table: string) => {
      switch (table) {
        case "rooms":
          return {
            ...createRoomsChain(),
            insert: mock(() => createInsertChain()),
          };
        case "room_participants":
          return createMessagesChain();
        default:
          return createRoomsChain();
      }
    }),
  };
};

// Mock Supabase module BEFORE imports
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => Promise.resolve(createMockSupabaseClient())),
  createCachedClient: mock(() => Promise.resolve(createMockSupabaseClient())),
  createServerClient: mock(() => Promise.resolve(createMockSupabaseClient())),
}));

// Import AFTER mocks are set up
import {
  getUserChatRooms,
  getChatRoom,
  getChatMessages,
  getUnreadMessageCount,
  getAllUserChats,
  getTotalUnreadCount,
} from "@/lib/data/chat";

describe("Chat Data Functions", () => {
  beforeEach(() => {
    mockState.rooms = [];
    mockState.room = null;
    mockState.messages = [];
    mockState.unreadRooms = [];
    mockState.error = null;
    mockState.insertedRoom = null;
  });

  describe("getUserChatRooms", () => {
    it("should return chat rooms for a user", async () => {
      mockState.rooms = [
        {
          id: "room-1",
          sharer: "user-123",
          requester: "user-456",
          post_id: 1,
          last_message: "Hello!",
          last_message_time: "2024-01-15T10:00:00Z",
          posts: { id: 1, post_name: "Fresh Apples", images: [], post_type: "food" },
          sharer_profile: {
            id: "user-123",
            first_name: "John",
            second_name: "Doe",
            avatar_url: null,
          },
          requester_profile: {
            id: "user-456",
            first_name: "Jane",
            second_name: "Smith",
            avatar_url: null,
          },
        },
        {
          id: "room-2",
          sharer: "user-789",
          requester: "user-123",
          post_id: 2,
          last_message: "Thanks!",
          last_message_time: "2024-01-14T10:00:00Z",
          posts: { id: 2, post_name: "Bread", images: [], post_type: "food" },
          sharer_profile: {
            id: "user-789",
            first_name: "Bob",
            second_name: "Brown",
            avatar_url: null,
          },
          requester_profile: {
            id: "user-123",
            first_name: "John",
            second_name: "Doe",
            avatar_url: null,
          },
        },
      ];

      const result = await getUserChatRooms("user-123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("room-1");
      expect(result[1].id).toBe("room-2");
    });

    it("should return empty array when user has no rooms", async () => {
      mockState.rooms = [];

      const result = await getUserChatRooms("user-123");

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      mockState.error = { message: "Database error" };

      const result = await getUserChatRooms("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getChatRoom", () => {
    it("should return a specific chat room", async () => {
      mockState.room = {
        id: "room-1",
        sharer: "user-123",
        requester: "user-456",
        post_id: 1,
        last_message: "Hello!",
        posts: { id: 1, post_name: "Fresh Apples", images: [], post_type: "food" },
        sharer_profile: {
          id: "user-123",
          first_name: "John",
          second_name: "Doe",
          avatar_url: null,
        },
        requester_profile: {
          id: "user-456",
          first_name: "Jane",
          second_name: "Smith",
          avatar_url: null,
        },
      };

      const result = await getChatRoom("room-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("room-1");
      expect(result?.sharer).toBe("user-123");
    });

    it("should return null when room not found", async () => {
      mockState.room = null;
      mockState.error = { message: "Not found", code: "PGRST116" };

      const result = await getChatRoom("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getChatMessages", () => {
    it("should return messages for a room in chronological order", async () => {
      mockState.messages = [
        {
          id: "msg-3",
          room_id: "room-1",
          profile_id: "user-456",
          text: "Third message",
          timestamp: "2024-01-15T10:02:00Z",
          profiles: { id: "user-456", first_name: "Jane", second_name: "Smith", avatar_url: null },
        },
        {
          id: "msg-2",
          room_id: "room-1",
          profile_id: "user-123",
          text: "Second message",
          timestamp: "2024-01-15T10:01:00Z",
          profiles: { id: "user-123", first_name: "John", second_name: "Doe", avatar_url: null },
        },
        {
          id: "msg-1",
          room_id: "room-1",
          profile_id: "user-123",
          text: "First message",
          timestamp: "2024-01-15T10:00:00Z",
          profiles: { id: "user-123", first_name: "John", second_name: "Doe", avatar_url: null },
        },
      ];

      const result = await getChatMessages("room-1");

      // Messages should be reversed to chronological order
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("msg-1");
      expect(result[2].id).toBe("msg-3");
    });

    it("should return empty array for room with no messages", async () => {
      mockState.messages = [];

      const result = await getChatMessages("room-1");

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      mockState.error = { message: "Database error" };

      const result = await getChatMessages("room-1");

      expect(result).toEqual([]);
    });

    it("should support pagination parameters", async () => {
      mockState.messages = [
        {
          id: "msg-1",
          room_id: "room-1",
          profile_id: "user-123",
          text: "Message",
          timestamp: "2024-01-15T10:00:00Z",
        },
      ];

      const result = await getChatMessages("room-1", 10, 5);

      expect(result).toHaveLength(1);
    });
  });

  describe("getUnreadMessageCount", () => {
    it("should return count of unread rooms", async () => {
      mockState.unreadRooms = [{ id: "room-1" }, { id: "room-2" }, { id: "room-3" }];

      const result = await getUnreadMessageCount("user-123");

      expect(result).toBe(3);
    });

    it("should return 0 when no unread messages", async () => {
      mockState.unreadRooms = [];

      const result = await getUnreadMessageCount("user-123");

      expect(result).toBe(0);
    });

    it("should return 0 on error", async () => {
      mockState.error = { message: "Database error" };

      const result = await getUnreadMessageCount("user-123");

      expect(result).toBe(0);
    });
  });

  describe("getAllUserChats", () => {
    it("should return unified chat rooms with sharer role", async () => {
      mockState.rooms = [
        {
          id: "room-1",
          sharer: "user-123",
          requester: "user-456",
          post_id: 1,
          last_message: "Hello!",
          last_message_time: "2024-01-15T10:00:00Z",
          last_message_seen_by: "user-123",
          post_arranged_to: null,
          posts: { id: 1, post_name: "Fresh Apples", images: ["apple.jpg"], post_type: "food" },
          sharer_profile: {
            id: "user-123",
            first_name: "John",
            second_name: "Doe",
            avatar_url: null,
          },
          requester_profile: {
            id: "user-456",
            first_name: "Jane",
            second_name: "Smith",
            avatar_url: "jane.jpg",
          },
        },
      ];

      const result = await getAllUserChats("user-123");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("room-1");
      expect(result[0].type).toBe("food");
      expect(result[0].isSharer).toBe(true);
      expect(result[0].title).toBe("Fresh Apples");
      expect(result[0].hasUnread).toBe(false);
      expect(result[0].participants).toHaveLength(1);
      expect(result[0].participants[0].firstName).toBe("Jane");
    });

    it("should return unified chat rooms with requester role", async () => {
      mockState.rooms = [
        {
          id: "room-1",
          sharer: "user-456",
          requester: "user-123",
          post_id: 1,
          last_message: "Hello!",
          last_message_time: "2024-01-15T10:00:00Z",
          last_message_seen_by: "user-456",
          post_arranged_to: null,
          posts: { id: 1, post_name: "Bread", images: [], post_type: "food" },
          sharer_profile: {
            id: "user-456",
            first_name: "Jane",
            second_name: "Smith",
            avatar_url: null,
          },
          requester_profile: {
            id: "user-123",
            first_name: "John",
            second_name: "Doe",
            avatar_url: null,
          },
        },
      ];

      const result = await getAllUserChats("user-123");

      expect(result).toHaveLength(1);
      expect(result[0].isSharer).toBe(false);
      expect(result[0].hasUnread).toBe(true);
      expect(result[0].participants[0].firstName).toBe("Jane");
    });

    it("should mark accepted requests correctly", async () => {
      mockState.rooms = [
        {
          id: "room-1",
          sharer: "user-123",
          requester: "user-456",
          post_id: 1,
          last_message: "See you tomorrow!",
          last_message_time: "2024-01-15T10:00:00Z",
          last_message_seen_by: "user-123",
          post_arranged_to: "user-456",
          posts: { id: 1, post_name: "Fresh Apples", images: [], post_type: "food" },
          sharer_profile: {
            id: "user-123",
            first_name: "John",
            second_name: "Doe",
            avatar_url: null,
          },
          requester_profile: {
            id: "user-456",
            first_name: "Jane",
            second_name: "Smith",
            avatar_url: null,
          },
        },
      ];

      const result = await getAllUserChats("user-123");

      expect(result[0].isAccepted).toBe(true);
    });

    it("should sort rooms with unread first, then by time", async () => {
      mockState.rooms = [
        {
          id: "room-1",
          sharer: "user-123",
          requester: "user-456",
          post_id: 1,
          last_message: "Old message",
          last_message_time: "2024-01-10T10:00:00Z",
          last_message_seen_by: "user-123",
          posts: { id: 1, post_name: "Apples", images: [], post_type: "food" },
          requester_profile: {
            id: "user-456",
            first_name: "Jane",
            second_name: "Smith",
            avatar_url: null,
          },
        },
        {
          id: "room-2",
          sharer: "user-123",
          requester: "user-789",
          post_id: 2,
          last_message: "Unread message",
          last_message_time: "2024-01-12T10:00:00Z",
          last_message_seen_by: "user-789",
          posts: { id: 2, post_name: "Bread", images: [], post_type: "food" },
          requester_profile: {
            id: "user-789",
            first_name: "Bob",
            second_name: "Brown",
            avatar_url: null,
          },
        },
      ];

      const result = await getAllUserChats("user-123");

      // Unread room should be first
      expect(result[0].id).toBe("room-2");
      expect(result[0].hasUnread).toBe(true);
      expect(result[1].id).toBe("room-1");
      expect(result[1].hasUnread).toBe(false);
    });

    it("should return empty array when user has no chats", async () => {
      mockState.rooms = [];

      const result = await getAllUserChats("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getTotalUnreadCount", () => {
    it("should delegate to getUnreadMessageCount", async () => {
      mockState.unreadRooms = [{ id: "room-1" }, { id: "room-2" }];

      const result = await getTotalUnreadCount("user-123");

      expect(result).toBe(2);
    });
  });
});
