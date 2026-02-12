/**
 * Email Server Actions Tests
 * Unit tests for email sending server actions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  userRoles: null as Array<{ roles: { name: string } }> | null,
  authError: null as { message: string } | null,
  emailSendResult: {
    success: true,
    messageId: "msg-123",
  } as { success: boolean; messageId?: string; error?: string },
  emailPreviewResult: {
    html: "<p>Preview</p>",
    text: "Preview",
    subject: "Test Subject",
  },
  unifiedEmailResult: {
    success: true,
    messageId: "unified-msg-123",
  } as { success: boolean; messageId?: string; error?: string },
};

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: mock(),
  revalidateTag: mock(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  unstable_noStore: () => {},
  cacheLife: () => {},
  cacheTag: () => {},
}));

// Mock email send module
mock.module("@/lib/email/send", () => ({
  sendTemplateEmail: mock(() => Promise.resolve(mockState.emailSendResult)),
  previewEmail: mock(() => Promise.resolve(mockState.emailPreviewResult)),
}));

// Mock unified email service
mock.module("@/lib/email/unified-service", () => ({
  createUnifiedEmailService: mock(() =>
    Promise.resolve({
      sendEmail: mock(() => Promise.resolve(mockState.unifiedEmailResult)),
    })
  ),
}));

// Mock notification API
mock.module("@/lib/notifications", () => ({
  sendEmailNotification: mock(() =>
    Promise.resolve({
      success: mockState.emailSendResult.success,
      data: { notificationId: mockState.emailSendResult.messageId },
      error: mockState.emailSendResult.error,
    })
  ),
}));

// Mock admin check
mock.module("@/lib/data/admin-check", () => ({
  checkUserIsAdmin: mock((_userId: string) => {
    // Check if the user has admin role in mockState
    const hasAdminRole = mockState.userRoles?.some(
      (ur) => ur.roles.name === "admin" || ur.roles.name === "superadmin"
    );
    return Promise.resolve({
      isAdmin: hasAdminRole || false,
    });
  }),
}));

// Define chain type for Supabase mock
interface MockChain {
  select: ReturnType<typeof mock>;
  eq: ReturnType<typeof mock>;
  single: ReturnType<typeof mock>;
}

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => {
    const createSelectChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        select: mock(() => chain),
        eq: mock(() => chain),
        single: mock(() => {
          // For profiles table lookup by email
          if (tableName === "profiles") {
            return Promise.resolve({
              data: { id: "test-profile-id" },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };

      // For user_roles table (array result)
      if (tableName === "user_roles") {
        Object.assign(chain, {
          then: (resolve: (value: unknown) => void) =>
            resolve({
              data: mockState.userRoles,
              error: null,
            }),
        });
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
  sendNewMessageNotification,
  sendListingInterestNotification,
  sendPickupReminder,
  sendReviewRequest,
  sendListingExpiredNotification,
  sendExchangeCompletionEmail,
  previewEmailTemplate,
  sendAdminEmail,
  sendTestEmailDirect,
} from "@/app/actions/email";

// Helper type to extract error from failed result
type FailedResult = { success: false; error: { message: string; code: string } };

// Type guard for failed results
function isFailedResult(result: { success: boolean }): result is FailedResult {
  return result.success === false;
}

describe("Email Server Actions", () => {
  beforeEach(() => {
    mockState.user = null;
    mockState.userRoles = null;
    mockState.authError = null;
    mockState.emailSendResult = {
      success: true,
      messageId: "msg-123",
    };
    mockState.unifiedEmailResult = {
      success: true,
      messageId: "unified-msg-123",
    };
  });

  // ==========================================================================
  // sendNewMessageNotification Tests
  // ==========================================================================

  describe("sendNewMessageNotification", () => {
    const validData = {
      senderName: "John Doe",
      senderAvatar: "https://example.com/avatar.jpg",
      messagePreview: "Hello, I am interested in your food listing!",
      conversationUrl: "https://foodshare.club/chat/123",
      listingTitle: "Fresh Vegetables",
      listingImage: "https://example.com/vegetables.jpg",
      listingType: "food",
    };

    it("should reject invalid email address", async () => {
      const result = await sendNewMessageNotification("invalid-email", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject empty email address", async () => {
      const result = await sendNewMessageNotification("", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject missing sender name", async () => {
      const result = await sendNewMessageNotification("test@example.com", {
        ...validData,
        senderName: "",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Sender name is required");
      }
    });

    it("should reject missing message preview", async () => {
      const result = await sendNewMessageNotification("test@example.com", {
        ...validData,
        messagePreview: "",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Message preview is required");
      }
    });

    it("should reject invalid conversation URL", async () => {
      const result = await sendNewMessageNotification("test@example.com", {
        ...validData,
        conversationUrl: "not-a-url",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid conversation URL");
      }
    });

    it("should send email successfully", async () => {
      const result = await sendNewMessageNotification("test@example.com", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });

    it("should handle email send failure", async () => {
      mockState.emailSendResult = {
        success: false,
        error: "Email provider error",
      };

      const result = await sendNewMessageNotification("test@example.com", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Email provider error");
      }
    });
  });

  // ==========================================================================
  // sendListingInterestNotification Tests
  // ==========================================================================

  describe("sendListingInterestNotification", () => {
    const validData = {
      interestedUserName: "Jane Smith",
      interestedUserAvatar: "https://example.com/jane.jpg",
      interestedUserRating: "4.8",
      interestedUserShares: "15",
      listingTitle: "Homemade Bread",
      listingImage: "https://example.com/bread.jpg",
      listingType: "food",
      listingLocation: "Prague, Czech Republic",
      messageUrl: "https://foodshare.club/chat/456",
      listingUrl: "https://foodshare.club/food/789",
    };

    it("should reject invalid email address", async () => {
      const result = await sendListingInterestNotification("bad-email", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject missing interested user name", async () => {
      const result = await sendListingInterestNotification("test@example.com", {
        ...validData,
        interestedUserName: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing listing title", async () => {
      const result = await sendListingInterestNotification("test@example.com", {
        ...validData,
        listingTitle: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid message URL", async () => {
      const result = await sendListingInterestNotification("test@example.com", {
        ...validData,
        messageUrl: "invalid",
      });

      expect(result.success).toBe(false);
    });

    it("should send email successfully", async () => {
      const result = await sendListingInterestNotification("test@example.com", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });

    it("should handle email send failure", async () => {
      mockState.emailSendResult = {
        success: false,
        error: "SMTP connection failed",
      };

      const result = await sendListingInterestNotification("test@example.com", validData);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // sendPickupReminder Tests
  // ==========================================================================

  describe("sendPickupReminder", () => {
    const validData = {
      pickupTime: "14:00",
      pickupDate: "2024-12-28",
      listingTitle: "Fresh Produce",
      listingImage: "https://example.com/produce.jpg",
      sharerName: "Bob Wilson",
      pickupAddress: "123 Food Street, Prague",
      pickupInstructions: "Ring the bell twice",
      directionsUrl: "https://maps.google.com/abc",
      messageUrl: "https://foodshare.club/chat/789",
    };

    it("should reject invalid email address", async () => {
      const result = await sendPickupReminder("notanemail", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject missing pickup time", async () => {
      const result = await sendPickupReminder("test@example.com", {
        ...validData,
        pickupTime: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing pickup date", async () => {
      const result = await sendPickupReminder("test@example.com", {
        ...validData,
        pickupDate: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing sharer name", async () => {
      const result = await sendPickupReminder("test@example.com", {
        ...validData,
        sharerName: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid directions URL", async () => {
      const result = await sendPickupReminder("test@example.com", {
        ...validData,
        directionsUrl: "not-a-url",
      });

      expect(result.success).toBe(false);
    });

    it("should send email successfully", async () => {
      const result = await sendPickupReminder("test@example.com", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });
  });

  // ==========================================================================
  // sendReviewRequest Tests
  // ==========================================================================

  describe("sendReviewRequest", () => {
    const validData = {
      recipientName: "Alice Johnson",
      sharerName: "Bob Smith",
      listingTitle: "Organic Fruits",
      listingImage: "https://example.com/fruits.jpg",
      pickupDate: "2024-12-25",
      reviewUrl: "https://foodshare.club/review/123",
    };

    it("should reject invalid email address", async () => {
      const result = await sendReviewRequest("@invalid", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject missing recipient name", async () => {
      const result = await sendReviewRequest("test@example.com", {
        ...validData,
        recipientName: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing sharer name", async () => {
      const result = await sendReviewRequest("test@example.com", {
        ...validData,
        sharerName: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing listing title", async () => {
      const result = await sendReviewRequest("test@example.com", {
        ...validData,
        listingTitle: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid review URL", async () => {
      const result = await sendReviewRequest("test@example.com", {
        ...validData,
        reviewUrl: "bad-url",
      });

      expect(result.success).toBe(false);
    });

    it("should send email successfully with star rating URLs", async () => {
      const result = await sendReviewRequest("test@example.com", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });
  });

  // ==========================================================================
  // sendListingExpiredNotification Tests
  // ==========================================================================

  describe("sendListingExpiredNotification", () => {
    const validData = {
      userName: "Charlie Brown",
      listingTitle: "Leftover Pizza",
      listingImage: "https://example.com/pizza.jpg",
      listingType: "food",
      expiryDate: "2024-12-27",
      renewUrl: "https://foodshare.club/food/123/renew",
      editUrl: "https://foodshare.club/food/123/edit",
      markSharedUrl: "https://foodshare.club/food/123/shared",
    };

    it("should reject invalid email address", async () => {
      const result = await sendListingExpiredNotification("wrong", validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should reject missing user name", async () => {
      const result = await sendListingExpiredNotification("test@example.com", {
        ...validData,
        userName: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing listing title", async () => {
      const result = await sendListingExpiredNotification("test@example.com", {
        ...validData,
        listingTitle: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid renew URL", async () => {
      const result = await sendListingExpiredNotification("test@example.com", {
        ...validData,
        renewUrl: "not-valid",
      });

      expect(result.success).toBe(false);
    });

    it("should send email successfully", async () => {
      const result = await sendListingExpiredNotification("test@example.com", validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });

    it("should handle email provider failure", async () => {
      mockState.emailSendResult = {
        success: false,
        error: "Rate limit exceeded",
      };

      const result = await sendListingExpiredNotification("test@example.com", validData);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // sendExchangeCompletionEmail Tests
  // ==========================================================================

  describe("sendExchangeCompletionEmail", () => {
    const validData = {
      to: "sharer@example.com",
      recipientName: "John",
      otherPartyName: "Jane Requester",
      itemName: "Fresh Vegetables",
      role: "sharer" as const,
      roomId: "550e8400-e29b-41d4-a716-446655440001",
    };

    it("should reject invalid email address", async () => {
      const result = await sendExchangeCompletionEmail({
        ...validData,
        to: "not-an-email",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid recipient email address" });
      }
    });

    it("should send email successfully for sharer role", async () => {
      const result = await sendExchangeCompletionEmail(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });

    it("should send email successfully for requester role", async () => {
      const result = await sendExchangeCompletionEmail({
        ...validData,
        role: "requester",
      });

      expect(result.success).toBe(true);
    });

    it("should handle email service failure", async () => {
      mockState.emailSendResult = {
        success: false,
        error: "Service unavailable",
      };

      const result = await sendExchangeCompletionEmail(validData);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Service unavailable");
      }
    });
  });

  // ==========================================================================
  // previewEmailTemplate Tests (Admin Only)
  // ==========================================================================

  describe("previewEmailTemplate", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await previewEmailTemplate("welcome-confirmation", {
        confirmationUrl: "https://example.com/confirm",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject non-admin users", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await previewEmailTemplate("welcome-confirmation", {
        confirmationUrl: "https://example.com/confirm",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Admin access required" });
      }
    });

    it("should allow admin to preview template", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await previewEmailTemplate("welcome-confirmation", {
        confirmationUrl: "https://example.com/confirm",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.html).toBe("<p>Preview</p>");
        expect(result.data.subject).toBe("Test Subject");
      }
    });

    it("should allow superadmin to preview template", async () => {
      mockState.user = { id: "super-123", email: "super@example.com" };
      mockState.userRoles = [{ roles: { name: "superadmin" } }];

      const result = await previewEmailTemplate("welcome-confirmation", {
        confirmationUrl: "https://example.com/confirm",
      });

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // sendAdminEmail Tests
  // ==========================================================================

  describe("sendAdminEmail", () => {
    const validInput = {
      to: "recipient@example.com",
      subject: "Test Subject",
      message: "Test message content",
      emailType: "newsletter",
      provider: "auto",
      useHtml: false,
    };

    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await sendAdminEmail(validInput);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject non-admin users", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await sendAdminEmail(validInput);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Admin access required" });
      }
    });

    it("should reject invalid email address", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendAdminEmail({
        ...validInput,
        to: "invalid",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid email address");
      }
    });

    it("should reject empty subject", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendAdminEmail({
        ...validInput,
        subject: "",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Subject is required");
      }
    });

    it("should reject empty message", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendAdminEmail({
        ...validInput,
        message: "",
      });

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Message is required");
      }
    });

    it("should send email successfully as admin", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendAdminEmail(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.messageId).toBe("msg-123");
      }
    });

    it("should send HTML email when useHtml is true", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendAdminEmail({
        ...validInput,
        message: "<h1>HTML Content</h1>",
        useHtml: true,
      });

      expect(result.success).toBe(true);
    });

    it("should handle email service failure", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
      mockState.emailSendResult = {
        success: false,
        error: "SMTP error",
      };

      const result = await sendAdminEmail(validInput);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // sendTestEmailDirect Tests
  // ==========================================================================

  describe("sendTestEmailDirect", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await sendTestEmailDirect("test@example.com", "Test Subject", "Test message");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject non-admin users", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await sendTestEmailDirect("test@example.com", "Test Subject", "Test message");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Admin access required" });
      }
    });

    it("should send test email successfully as admin", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendTestEmailDirect(
        "test@example.com",
        "Test Subject",
        "Test message body"
      );

      expect(result.success).toBe(true);
    });

    it("should reject invalid email", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await sendTestEmailDirect("not-valid", "Test Subject", "Test message");

      expect(result.success).toBe(false);
    });
  });
});
