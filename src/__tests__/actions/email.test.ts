/* oxlint-disable unicorn/no-thenable -- Supabase query builder mocks must be thenable. */
/**
 * Email Server Actions Tests
 * Unit tests for email sending server actions
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  userRoles: null as Array<{ roles: { name: string } }> | null,
  authError: null as { message: string } | null,
  dbError: null as { message: string } | null,
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
    }),
  ),
}));

// Mock notification API
mock.module("@/lib/notifications", () => ({
  sendEmailNotification: mock(() =>
    Promise.resolve({
      success: mockState.emailSendResult.success,
      data: { notificationId: mockState.emailSendResult.messageId },
      error: mockState.emailSendResult.error,
    }),
  ),
}));

// Mock Supabase admin
mock.module("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tableName: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: tableName === "user_roles" ? (mockState.userRoles ?? []) : null,
            error: mockState.dbError,
          }),
      }),
    }),
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
          }),
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
    }),
  ),
  createServerClient: mock(() => Promise.resolve({})),
}));

// Import actions after mocks
// Only the admin-gated exports remain. The six unauthenticated notification
// actions and `sendEmailAsync` were removed: they had no callers, and being
// exports of a `'use server'` module they were reachable by anyone who read the
// client bundle, turning the app into a branded-email relay. Exchange-completion
// delivery now lives in the non-action module `@/lib/email/exchange-completion`.
import { previewEmailTemplate, sendAdminEmail, sendTestEmailDirect } from "@/app/actions/email";

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

      const result = await sendTestEmailDirect("test@example.com", "Test Subject", "Test message body");

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
