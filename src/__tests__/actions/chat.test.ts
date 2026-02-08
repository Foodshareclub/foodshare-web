/**
 * Chat Server Actions Tests
 * Unit tests for chat management server actions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  room: null as {
    id: string;
    sharer: string;
    requester: string;
    post_id?: number;
    post_arranged_to?: string | null;
    posts?: { id: number; post_name: string; post_address: string; profile_id: string } | null;
    sharer_profile?: { id: string; first_name: string; second_name: string; email: string } | null;
    requester_profile?: {
      id: string;
      first_name: string;
      second_name: string;
      email: string;
    } | null;
  } | null,
  post: null as { id: number; profile_id: string } | null,
  existingRoom: null as { id: string } | null,
  newRoom: null as { id: string } | null,
  messageCount: 0,
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
};

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: mock(),
  revalidateTag: mock(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  unstable_noStore: () => {},
}));

// Mock cache-keys
mock.module("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (typeof prop === "string") {
        const staticTags: Record<string, string> = {
          CHATS: "chats",
          PROFILES: "profiles",
          PRODUCTS: "products",
          POST_ACTIVITY: "post-activity",
          POST_ACTIVITY_STATS: "post-activity-stats",
          ADMIN: "admin",
          NEWSLETTER: "newsletter",
          CAMPAIGNS: "campaigns",
          SEGMENTS: "segments",
          AUTOMATIONS: "automations",
          SUBSCRIBERS: "subscribers",
        };
        return staticTags[prop] ?? ((id: unknown) => `${String(prop).toLowerCase()}-${id}`);
      }
      return "";
    },
  }),
  CACHE_DURATIONS: { SHORT: 60, MEDIUM: 300, LONG: 3600, CHATS: 30, CHAT_MESSAGES: 30 },
  CACHE_PROFILES: { DEFAULT: "default", INSTANT: { expire: 0 } },
  invalidateTag: mock(),
  logCacheOperation: () => {},
  getProductTags: () => [],
  getProfileTags: () => [],
  getForumTags: () => [],
  getChallengeTags: () => [],
  getNotificationTags: () => [],
  getAdminTags: () => [],
  getNewsletterTags: () => [],
  invalidateAdminCaches: () => {},
  getPostActivityTags: () => [],
  invalidatePostActivityCaches: mock(),
  invalidateNewsletterCaches: () => {},
  getEmailTags: () => [],
  invalidateEmailCaches: () => {},
}));

// Mock analytics — must include ALL exports to prevent global contamination
const mockResult = () => Promise.resolve({ success: true, data: null });
mock.module("@/app/actions/analytics", () => ({
  trackEvent: mock(() => Promise.resolve()),
  getAnalyticsSummary: mock(mockResult),
  getMonthlyGrowth: mock(mockResult),
  getDailyActiveUsers: mock(mockResult),
  getEventDistribution: mock(mockResult),
  getConversionFunnel: mock(mockResult),
  getUserRetentionCohorts: mock(mockResult),
  getInventoryAging: mock(mockResult),
  getListingTypeDistribution: mock(mockResult),
  getTopSharers: mock(mockResult),
  getSyncStatus: mock(mockResult),
  getGeographicHotspots: mock(mockResult),
  getActivityByHour: mock(mockResult),
  triggerAnalyticsSync: mock(mockResult),
}));

// Mock post-activity — must include ALL exports
mock.module("@/app/actions/post-activity", () => ({
  logPostActivity: mock(mockResult),
  logPostView: mock(mockResult),
  logPostContact: mock(mockResult),
  logPostArrangement: mock(mockResult),
  logArrangementCancelled: mock(mockResult),
  logPostCollected: mock(mockResult),
  logPostNotCollected: mock(mockResult),
  logPostShared: mock(mockResult),
  logAdminPostAction: mock(mockResult),
  getPostActivityTimeline: mock(mockResult),
  getUserPostActivitySummary: mock(mockResult),
  getRecentPostActivities: mock(mockResult),
  getPostActivityCounts: mock(mockResult),
  bulkLogPostActivities: mock(mockResult),
}));

// Mock email — must include ALL exports
mock.module("@/app/actions/email", () => ({
  sendEmailAsync: mock(mockResult),
  sendNewMessageNotification: mock(mockResult),
  sendListingInterestNotification: mock(mockResult),
  sendPickupReminder: mock(mockResult),
  sendReviewRequest: mock(mockResult),
  sendListingExpiredNotification: mock(mockResult),
  sendExchangeCompletionEmail: mock(mockResult),
  previewEmailTemplate: mock(mockResult),
  sendAdminEmail: mock(mockResult),
  sendTestEmailDirect: mock(mockResult),
}));

// Define chain type for Supabase mock
interface MockChain {
  select: ReturnType<typeof mock>;
  eq: ReturnType<typeof mock>;
  single: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
  insert: ReturnType<typeof mock>;
  gte: ReturnType<typeof mock>;
}

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => {
    const createSelectChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        select: mock(() => chain),
        eq: mock(() => chain),
        gte: mock(() => chain),
        single: mock(() => {
          if (tableName === "rooms") {
            return Promise.resolve({
              data: mockState.room,
              error: mockState.dbError,
            });
          }
          if (tableName === "posts") {
            return Promise.resolve({
              data: mockState.post,
              error: mockState.dbError,
            });
          }
          return Promise.resolve({ data: null, error: mockState.dbError });
        }),
        update: mock(() => ({
          eq: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
        })),
        insert: mock(() => {
          if (tableName === "rooms" && mockState.newRoom) {
            return {
              select: mock(() => ({
                single: mock(() =>
                  Promise.resolve({ data: mockState.newRoom, error: mockState.dbError })
                ),
              })),
            };
          }
          return Promise.resolve({ data: null, error: mockState.dbError });
        }),
      };

      // For message count query
      if (tableName === "room_participants") {
        Object.assign(chain, {
          then: (resolve: (value: unknown) => void) =>
            resolve({
              count: mockState.messageCount,
              error: mockState.dbError,
            }),
        });
      }

      // For existing room check
      if (tableName === "rooms" && mockState.existingRoom) {
        chain.single = mock(() =>
          Promise.resolve({
            data: mockState.existingRoom,
            error: null,
          })
        );
      }

      return chain;
    };

    return Promise.resolve({
      auth: {
        getUser: mock(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
      },
      from: mock((tableName: string) => createSelectChain(tableName)),
    });
  }),
  createCachedClient: mock(() =>
    Promise.resolve({
      from: mock(() => ({
        select: mock(() => ({
          eq: mock(() => ({ single: mock(() => Promise.resolve({ data: null, error: null })) })),
        })),
      })),
    })
  ),
  createServerClient: mock(() => Promise.resolve({})),
}));

// Import actions after mocks
import {
  sendFoodChatMessage,
  markFoodChatAsRead,
  createFoodChatRoom,
  updateRoom,
  writeReview,
  acceptRequestAndShareAddress,
  completeExchange,
  archiveChatRoom,
} from "@/app/actions/chat";

// Helper type to extract error from failed result
type FailedResult = { success: false; error: { message: string; code: string } };

// Type guard for failed results
function isFailedResult(result: { success: boolean }): result is FailedResult {
  return result.success === false;
}

describe("Chat Server Actions", () => {
  // Valid UUIDs for testing
  const validUserId = "550e8400-e29b-41d4-a716-446655440001";
  const validSharerId = "550e8400-e29b-41d4-a716-446655440002";
  const validRoomId = "550e8400-e29b-41d4-a716-446655440003";
  const validProfileId = "550e8400-e29b-41d4-a716-446655440004";

  beforeEach(() => {
    mockState.user = null;
    mockState.room = null;
    mockState.post = null;
    mockState.existingRoom = null;
    mockState.newRoom = null;
    mockState.messageCount = 0;
    mockState.authError = null;
    mockState.dbError = null;
  });

  // ==========================================================================
  // sendFoodChatMessage Tests
  // ==========================================================================

  describe("sendFoodChatMessage", () => {
    const createFormData = (data: Record<string, string | null>) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null) formData.append(key, value);
      });
      return formData;
    };

    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        roomId: validRoomId,
        text: "Hello",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should validate room ID format", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        roomId: "invalid-uuid",
        text: "Hello",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid room ID");
      }
    });

    it("should reject empty messages", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        roomId: validRoomId,
        text: "",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Message cannot be empty");
      }
    });

    it("should reject messages that are too long", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        roomId: validRoomId,
        text: "a".repeat(5001),
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Message too long");
      }
    });

    it("should reject if room not found", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = null;

      const formData = createFormData({
        roomId: validRoomId,
        text: "Hello",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Chat room not found" });
      }
    });

    it("should reject if user is not a participant", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: "550e8400-e29b-41d4-a716-446655440099", // Different user
      };

      const formData = createFormData({
        roomId: validRoomId,
        text: "Hello",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You are not a participant in this chat" });
      }
    });

    it("should send message successfully as sharer", async () => {
      mockState.user = { id: validSharerId, email: "sharer@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
      };
      mockState.messageCount = 0;

      const formData = createFormData({
        roomId: validRoomId,
        text: "Hello from sharer",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(true);
    });

    it("should send message successfully as requester", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
      };
      mockState.messageCount = 0;

      const formData = createFormData({
        roomId: validRoomId,
        text: "Hello from requester",
      });

      const result = await sendFoodChatMessage(formData);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // markFoodChatAsRead Tests
  // ==========================================================================

  describe("markFoodChatAsRead", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await markFoodChatAsRead(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await markFoodChatAsRead("invalid-uuid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should reject empty room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await markFoodChatAsRead("");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should mark room as read successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await markFoodChatAsRead(validRoomId);

      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.dbError = { message: "Database connection failed" };

      const result = await markFoodChatAsRead(validRoomId);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // createFoodChatRoom Tests
  // ==========================================================================

  describe("createFoodChatRoom", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await createFoodChatRoom(1, validSharerId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid post ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await createFoodChatRoom(0, validSharerId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid post ID");
      }
    });

    it("should reject negative post ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await createFoodChatRoom(-5, validSharerId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid post ID");
      }
    });

    it("should reject invalid sharer ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await createFoodChatRoom(1, "invalid-uuid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid sharer ID");
      }
    });

    it("should prevent self-chat", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await createFoodChatRoom(1, validUserId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({
          message: "You cannot chat with yourself about your own listing",
        });
      }
    });

    it("should prevent requesting own listing", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.post = { id: 1, profile_id: validUserId };

      const result = await createFoodChatRoom(1, validSharerId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({
          message: "You cannot request your own listing",
        });
      }
    });

    it("should return existing room if already exists", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.post = { id: 1, profile_id: validSharerId };
      mockState.existingRoom = { id: validRoomId };

      const result = await createFoodChatRoom(1, validSharerId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomId).toBe(validRoomId);
      }
    });

    it("should create new room successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.post = { id: 1, profile_id: validSharerId };
      mockState.existingRoom = null;
      mockState.newRoom = { id: validRoomId };

      const result = await createFoodChatRoom(1, validSharerId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.roomId).toBe(validRoomId);
      }
    });
  });

  // ==========================================================================
  // updateRoom Tests
  // ==========================================================================

  describe("updateRoom", () => {
    const createFormData = (data: Record<string, string>) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return formData;
    };

    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        post_arranged_to: validUserId,
      });

      const result = await updateRoom(validRoomId, formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        post_arranged_to: validUserId,
      });

      const result = await updateRoom("invalid-uuid", formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should reject empty update data", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = new FormData();

      const result = await updateRoom(validRoomId, formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "No update data provided" });
      }
    });

    it("should update room successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        post_id: 1,
        sharer: validSharerId,
        requester: validUserId,
      };

      const formData = createFormData({
        post_arranged_to: validUserId,
      });

      const result = await updateRoom(validRoomId, formData);

      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.dbError = { message: "Database error" };

      const formData = createFormData({
        post_arranged_to: validUserId,
      });

      const result = await updateRoom(validRoomId, formData);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // writeReview Tests
  // ==========================================================================

  describe("writeReview", () => {
    const createFormData = (data: Record<string, string>) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });
      return formData;
    };

    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "1",
        reviewed_rating: "5",
        feedback: "Great exchange!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid profile ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: "invalid-uuid",
        post_id: "1",
        reviewed_rating: "5",
        feedback: "Great!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid profile ID");
      }
    });

    it("should reject invalid post ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "0",
        reviewed_rating: "5",
        feedback: "Great!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid post ID");
      }
    });

    it("should reject rating below 1", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "1",
        reviewed_rating: "0",
        feedback: "Bad!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
    });

    it("should reject rating above 5", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "1",
        reviewed_rating: "6",
        feedback: "Amazing!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
    });

    it("should prevent self-review", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: validUserId, // Same as user
        post_id: "1",
        reviewed_rating: "5",
        feedback: "Great!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You cannot review yourself" });
      }
    });

    it("should submit review successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "1",
        reviewed_rating: "5",
        feedback: "Great exchange!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(true);
    });

    it("should handle duplicate review", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.dbError = { message: "Duplicate key", code: "23505" };

      const formData = createFormData({
        profile_id: validProfileId,
        post_id: "1",
        reviewed_rating: "5",
        feedback: "Great!",
      });

      const result = await writeReview(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You have already reviewed this exchange" });
      }
    });
  });

  // ==========================================================================
  // acceptRequestAndShareAddress Tests
  // ==========================================================================

  describe("acceptRequestAndShareAddress", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await acceptRequestAndShareAddress(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await acceptRequestAndShareAddress("invalid-uuid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid room ID");
      }
    });

    it("should reject if room not found", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = null;

      const result = await acceptRequestAndShareAddress(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Chat room not found" });
      }
    });

    it("should reject if user is not the sharer", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId, // Different from user
        requester: validUserId,
        post_id: 1,
        post_arranged_to: null,
      };

      const result = await acceptRequestAndShareAddress(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Only the food owner can accept requests" });
      }
    });

    it("should reject if already accepted", async () => {
      mockState.user = { id: validSharerId, email: "sharer@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
        post_id: 1,
        post_arranged_to: validUserId, // Already accepted
      };

      const result = await acceptRequestAndShareAddress(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "This request has already been accepted" });
      }
    });

    it("should accept request successfully", async () => {
      mockState.user = { id: validSharerId, email: "sharer@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
        post_id: 1,
        post_arranged_to: null,
        posts: {
          id: 1,
          post_name: "Fresh Vegetables",
          post_address: "123 Food Street",
          profile_id: validSharerId,
        },
      };

      const result = await acceptRequestAndShareAddress(validRoomId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.address).toBe("123 Food Street");
      }
    });
  });

  // ==========================================================================
  // completeExchange Tests
  // ==========================================================================

  describe("completeExchange", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await completeExchange("invalid-uuid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should reject if room not found", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = null;

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Chat room not found" });
      }
    });

    it("should reject if user is not a participant", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: "550e8400-e29b-41d4-a716-446655440099", // Different user
        post_id: 1,
        post_arranged_to: "550e8400-e29b-41d4-a716-446655440099",
      };

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You are not a participant in this chat" });
      }
    });

    it("should reject if request not yet accepted", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
        post_id: 1,
        post_arranged_to: null, // Not yet accepted
      };

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({
          message: "Request must be accepted before completing",
        });
      }
    });

    it("should complete exchange successfully as sharer", async () => {
      mockState.user = { id: validSharerId, email: "sharer@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
        post_id: 1,
        post_arranged_to: validUserId,
        sharer_profile: {
          id: validSharerId,
          first_name: "John",
          second_name: "Sharer",
          email: "sharer@example.com",
        },
        requester_profile: {
          id: validUserId,
          first_name: "Jane",
          second_name: "Requester",
          email: "requester@example.com",
        },
      };

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(true);
    });

    it("should complete exchange successfully as requester", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
        post_id: 1,
        post_arranged_to: validUserId,
      };

      const result = await completeExchange(validRoomId);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // archiveChatRoom Tests
  // ==========================================================================

  describe("archiveChatRoom", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await archiveChatRoom("invalid-uuid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should reject empty room ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await archiveChatRoom("");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid room ID" });
      }
    });

    it("should reject if room not found", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = null;

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Chat room not found" });
      }
    });

    it("should reject if user is not a participant", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: "550e8400-e29b-41d4-a716-446655440099", // Different user
      };

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You are not part of this chat" });
      }
    });

    it("should archive room successfully as sharer", async () => {
      mockState.user = { id: validSharerId, email: "sharer@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
      };

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(true);
    });

    it("should archive room successfully as requester", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
      };

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.room = {
        id: validRoomId,
        sharer: validSharerId,
        requester: validUserId,
      };
      mockState.dbError = { message: "Database error" };

      const result = await archiveChatRoom(validRoomId);

      expect(result.success).toBe(false);
    });
  });
});
