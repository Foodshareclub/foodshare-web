/**
 * Newsletter & Campaign Server Actions Tests
 * Unit tests for newsletter and campaign management server actions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
  campaignData: null as { id: string } | null,
  subscriberData: null as { id: string } | null,
  segmentData: null as { id: string } | null,
  flowData: null as { id: string } | null,
  enrollmentData: null as { id: string } | null,
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
          NEWSLETTER: "newsletter",
          CAMPAIGNS: "campaigns",
          SEGMENTS: "segments",
          AUTOMATIONS: "automations",
          SUBSCRIBERS: "subscribers",
          POST_ACTIVITY: "post-activity",
          POST_ACTIVITY_STATS: "post-activity-stats",
          ADMIN: "admin",
          PRODUCTS: "products",
          PROFILES: "profiles",
        };
        return staticTags[prop] ?? ((id: unknown) => `${String(prop).toLowerCase()}-${id}`);
      }
      return "";
    },
  }),
  CACHE_DURATIONS: { SHORT: 60, MEDIUM: 300, LONG: 3600, NEWSLETTER: 300, CAMPAIGNS: 300 },
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
  invalidatePostActivityCaches: () => {},
  invalidateNewsletterCaches: () => {},
  getEmailTags: () => [],
  invalidateEmailCaches: () => {},
}));

// Define chain type for Supabase mock
interface MockChain {
  select: ReturnType<typeof mock>;
  eq: ReturnType<typeof mock>;
  single: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
  insert: ReturnType<typeof mock>;
}

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => {
    const createSelectChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        select: mock(() => chain),
        eq: mock(() => chain),
        single: mock(() => {
          if (tableName === "newsletter_campaigns") {
            return Promise.resolve({
              data: mockState.campaignData,
              error: mockState.dbError,
            });
          }
          if (tableName === "newsletter_subscribers") {
            return Promise.resolve({
              data: mockState.subscriberData,
              error: mockState.dbError,
            });
          }
          if (tableName === "audience_segments") {
            return Promise.resolve({
              data: mockState.segmentData,
              error: mockState.dbError,
            });
          }
          if (tableName === "email_automation_flows") {
            return Promise.resolve({
              data: mockState.flowData,
              error: mockState.dbError,
            });
          }
          if (tableName === "automation_enrollments") {
            return Promise.resolve({
              data: mockState.enrollmentData,
              error: mockState.dbError,
            });
          }
          return Promise.resolve({ data: null, error: mockState.dbError });
        }),
        update: mock(() => ({
          eq: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
        })),
        insert: mock(() => ({
          select: mock(() => ({
            single: mock(() => {
              if (tableName === "newsletter_campaigns") {
                return Promise.resolve({
                  data: mockState.campaignData,
                  error: mockState.dbError,
                });
              }
              if (tableName === "newsletter_subscribers") {
                return Promise.resolve({
                  data: mockState.subscriberData,
                  error: mockState.dbError,
                });
              }
              if (tableName === "audience_segments") {
                return Promise.resolve({
                  data: mockState.segmentData,
                  error: mockState.dbError,
                });
              }
              if (tableName === "email_automation_flows") {
                return Promise.resolve({
                  data: mockState.flowData,
                  error: mockState.dbError,
                });
              }
              if (tableName === "automation_enrollments") {
                return Promise.resolve({
                  data: mockState.enrollmentData,
                  error: mockState.dbError,
                });
              }
              return Promise.resolve({ data: null, error: mockState.dbError });
            }),
          })),
        })),
      };

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
      rpc: mock(() => Promise.resolve({ data: null, error: null })),
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
  createCampaign,
  updateCampaignStatus,
  scheduleCampaign,
  addSubscriber,
  unsubscribeEmail,
  createSegment,
  createAutomationFlow,
  updateAutomationStatus,
  enrollUserInAutomation,
} from "@/app/actions/newsletter";

// Helper type to extract error from failed result
type FailedResult = { success: false; error: { message: string; code: string } };

// Type guard for failed results
function isFailedResult(result: { success: boolean }): result is FailedResult {
  return result.success === false;
}

describe("Newsletter Server Actions", () => {
  // Valid UUIDs for testing
  const validUserId = "550e8400-e29b-41d4-a716-446655440001";
  const validCampaignId = "550e8400-e29b-41d4-a716-446655440002";
  const validFlowId = "550e8400-e29b-41d4-a716-446655440003";
  const validProfileId = "550e8400-e29b-41d4-a716-446655440004";

  const createFormData = (data: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  };

  beforeEach(() => {
    mockState.user = null;
    mockState.authError = null;
    mockState.dbError = null;
    mockState.campaignData = null;
    mockState.subscriberData = null;
    mockState.segmentData = null;
    mockState.flowData = null;
    mockState.enrollmentData = null;
  });

  // ==========================================================================
  // createCampaign Tests
  // ==========================================================================

  describe("createCampaign", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        name: "Test Campaign",
        subject: "Test Subject",
        htmlContent: "<p>Content</p>",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject missing campaign name", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "",
        subject: "Test Subject",
        htmlContent: "<p>Content</p>",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Campaign name is required");
      }
    });

    it("should reject missing subject", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Test Campaign",
        subject: "",
        htmlContent: "<p>Content</p>",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Subject is required");
      }
    });

    it("should reject missing content", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Test Campaign",
        subject: "Test Subject",
        htmlContent: "",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(false);
      // Zod returns "Content is required" for empty string
      if (isFailedResult(result)) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it("should create campaign successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.campaignData = { id: validCampaignId };

      const formData = createFormData({
        name: "Weekly Newsletter",
        subject: "This Week in FoodShare",
        previewText: "Check out what is new this week",
        htmlContent: "<h1>Welcome</h1><p>Content here</p>",
        campaignType: "newsletter",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.campaignId).toBe(validCampaignId);
      }
    });

    it("should handle database error", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.dbError = { message: "Database error" };

      const formData = createFormData({
        name: "Test Campaign",
        subject: "Test Subject",
        htmlContent: "<p>Content</p>",
      });

      const result = await createCampaign(formData);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // updateCampaignStatus Tests
  // ==========================================================================

  describe("updateCampaignStatus", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await updateCampaignStatus(validCampaignId, "draft");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid campaign ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus("invalid-uuid", "draft");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid campaign ID" });
      }
    });

    it("should reject invalid status", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus(validCampaignId, "invalid" as never);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid status" });
      }
    });

    it("should update status to draft", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus(validCampaignId, "draft");

      expect(result.success).toBe(true);
    });

    it("should update status to sent", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus(validCampaignId, "sent");

      expect(result.success).toBe(true);
    });

    it("should update status to paused", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus(validCampaignId, "paused");

      expect(result.success).toBe(true);
    });

    it("should update status to cancelled", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateCampaignStatus(validCampaignId, "cancelled");

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // scheduleCampaign Tests
  // ==========================================================================

  describe("scheduleCampaign", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await scheduleCampaign(validCampaignId, "2024-12-31T10:00:00Z");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid campaign ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await scheduleCampaign("bad-id", "2024-12-31T10:00:00Z");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid campaign ID");
      }
    });

    it("should reject invalid date format", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await scheduleCampaign(validCampaignId, "not-a-date");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid date format");
      }
    });

    it("should schedule campaign successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await scheduleCampaign(validCampaignId, "2024-12-31T10:00:00Z");

      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.dbError = { message: "Database error" };

      const result = await scheduleCampaign(validCampaignId, "2024-12-31T10:00:00Z");

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // addSubscriber Tests (No auth required)
  // ==========================================================================

  describe("addSubscriber", () => {
    it("should reject invalid email address", async () => {
      const result = await addSubscriber("not-an-email");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid email address");
      }
    });

    it("should reject empty email", async () => {
      const result = await addSubscriber("");

      expect(result.success).toBe(false);
    });

    it("should add subscriber successfully", async () => {
      mockState.subscriberData = { id: "sub-123" };

      const result = await addSubscriber("subscriber@example.com");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.subscriberId).toBe("sub-123");
      }
    });

    it("should add subscriber with first name", async () => {
      mockState.subscriberData = { id: "sub-456" };

      const result = await addSubscriber("subscriber@example.com", "John");

      expect(result.success).toBe(true);
    });

    it("should add subscriber with source", async () => {
      mockState.subscriberData = { id: "sub-789" };

      const result = await addSubscriber("subscriber@example.com", "Jane", "referral");

      expect(result.success).toBe(true);
    });

    it("should handle duplicate email", async () => {
      mockState.dbError = { message: "Duplicate key", code: "23505" };

      const result = await addSubscriber("existing@example.com");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Email already subscribed" });
      }
    });
  });

  // ==========================================================================
  // unsubscribeEmail Tests (No auth required)
  // ==========================================================================

  describe("unsubscribeEmail", () => {
    it("should reject invalid email address", async () => {
      const result = await unsubscribeEmail("invalid");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid email address" });
      }
    });

    it("should reject empty email", async () => {
      const result = await unsubscribeEmail("");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid email address" });
      }
    });

    it("should unsubscribe successfully", async () => {
      const result = await unsubscribeEmail("user@example.com");

      expect(result.success).toBe(true);
    });

    it("should unsubscribe with reason", async () => {
      const result = await unsubscribeEmail("user@example.com", "Too many emails");

      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.dbError = { message: "Database error" };

      const result = await unsubscribeEmail("user@example.com");

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // createSegment Tests
  // ==========================================================================

  describe("createSegment", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        name: "Active Users",
        description: "Users active in last 30 days",
        criteria: "{}",
      });

      const result = await createSegment(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject missing segment name", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "",
        criteria: "{}",
      });

      const result = await createSegment(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Segment name is required");
      }
    });

    it("should reject invalid criteria JSON", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Test Segment",
        criteria: "not-json",
      });

      const result = await createSegment(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid criteria JSON");
      }
    });

    it("should create segment successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.segmentData = { id: "seg-123" };

      const formData = createFormData({
        name: "Active Users",
        description: "Users active in last 30 days",
        criteria: JSON.stringify({ daysActive: 30 }),
        color: "#22c55e",
      });

      const result = await createSegment(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.segmentId).toBe("seg-123");
      }
    });

    it("should reject invalid color format", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Test Segment",
        criteria: "{}",
        color: "red", // Invalid - should be hex
      });

      const result = await createSegment(formData);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // createAutomationFlow Tests
  // ==========================================================================

  describe("createAutomationFlow", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const formData = createFormData({
        name: "Welcome Flow",
        triggerType: "signup",
        triggerConfig: "{}",
        steps: "[]",
      });

      const result = await createAutomationFlow(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject missing flow name", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "",
        triggerType: "signup",
        triggerConfig: "{}",
        steps: "[]",
      });

      const result = await createAutomationFlow(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Flow name is required");
      }
    });

    it("should reject missing trigger type", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Welcome Flow",
        triggerType: "",
        triggerConfig: "{}",
        steps: "[]",
      });

      const result = await createAutomationFlow(formData);

      expect(result.success).toBe(false);
      // Zod validation will fail for empty trigger type
      if (isFailedResult(result)) {
        expect(result.error.message).toBeTruthy();
      }
    });

    it("should reject invalid JSON configuration", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const formData = createFormData({
        name: "Welcome Flow",
        triggerType: "signup",
        triggerConfig: "not-json",
        steps: "also-not-json",
      });

      const result = await createAutomationFlow(formData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid JSON configuration");
      }
    });

    it("should create automation flow successfully", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };
      mockState.flowData = { id: validFlowId };

      const formData = createFormData({
        name: "Welcome Flow",
        description: "Welcome new users",
        triggerType: "signup",
        triggerConfig: JSON.stringify({ delay: 0 }),
        steps: JSON.stringify([{ type: "email", template: "welcome" }]),
      });

      const result = await createAutomationFlow(formData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flowId).toBe(validFlowId);
      }
    });
  });

  // ==========================================================================
  // updateAutomationStatus Tests
  // ==========================================================================

  describe("updateAutomationStatus", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await updateAutomationStatus(validFlowId, "active");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject invalid flow ID", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateAutomationStatus("bad-id", "active");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid flow ID" });
      }
    });

    it("should reject invalid status", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateAutomationStatus(validFlowId, "invalid" as never);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid status" });
      }
    });

    it("should update status to active", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateAutomationStatus(validFlowId, "active");

      expect(result.success).toBe(true);
    });

    it("should update status to paused", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateAutomationStatus(validFlowId, "paused");

      expect(result.success).toBe(true);
    });

    it("should update status to archived", async () => {
      mockState.user = { id: validUserId, email: "user@example.com" };

      const result = await updateAutomationStatus(validFlowId, "archived");

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // enrollUserInAutomation Tests (No auth required)
  // ==========================================================================

  describe("enrollUserInAutomation", () => {
    it("should reject invalid flow ID", async () => {
      const result = await enrollUserInAutomation("bad-flow-id", validProfileId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid flow ID" });
      }
    });

    it("should reject invalid profile ID", async () => {
      const result = await enrollUserInAutomation(validFlowId, "bad-profile-id");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid profile ID" });
      }
    });

    it("should enroll user successfully", async () => {
      mockState.enrollmentData = { id: "enrollment-123" };

      const result = await enrollUserInAutomation(validFlowId, validProfileId);

      expect(result.success).toBe(true);
    });

    it("should handle already enrolled (duplicate key)", async () => {
      mockState.dbError = { message: "Duplicate key", code: "23505" };

      const result = await enrollUserInAutomation(validFlowId, validProfileId);

      // Already enrolled is not an error - returns success
      expect(result.success).toBe(true);
    });

    it("should handle database error", async () => {
      mockState.dbError = { message: "Database error", code: "OTHER" };

      const result = await enrollUserInAutomation(validFlowId, validProfileId);

      expect(result.success).toBe(false);
    });
  });
});
