/**
 * Admin Server Actions Tests
 * Unit tests for admin management server actions
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  profile: null as {
    id: string;
    first_name: string;
    second_name: string;
    email: string;
    is_active: boolean;
  } | null,
  userRoles: null as Array<{ roles: { name: string } }> | null,
  listing: null as { id: number; post_name: string; profile_id: string } | null,
  roleData: null as { id: string } | null,
  authError: null as { message: string } | null,
  dbError: null as { message: string; code?: string } | null,
  usersData: [] as Array<{
    id: string;
    first_name: string;
    second_name: string;
    email: string;
    created_time: string;
    is_active: boolean;
  }>,
  usersCount: 0,
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
        const staticTags: Record<string, unknown> = {
          ADMIN: "admin",
          ADMIN_LISTINGS: "admin-listings",
          ADMIN_USERS: "admin-users",
          ADMIN_STATS: "admin-stats",
          ADMIN_REPORTS: "admin-reports",
          ADMIN_CRM: "admin-crm",
          PRODUCTS: "products",
          PRODUCT_LOCATIONS: "product-locations",
          PROFILES: "profiles",
          AUDIT_LOGS: "audit-logs",
          POST_ACTIVITY: "post-activity",
          POST_ACTIVITY_STATS: "post-activity-stats",
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
  CACHE_DURATIONS: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600,
    VERY_LONG: 86400,
    PRODUCTS: 60,
    PROFILES: 300,
  },
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
  or: ReturnType<typeof mock>;
  order: ReturnType<typeof mock>;
  range: ReturnType<typeof mock>;
  single: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
  delete: ReturnType<typeof mock>;
  upsert: ReturnType<typeof mock>;
  insert: ReturnType<typeof mock>;
}

// Helper function to create Supabase mock (shared between server and admin clients)
const createSupabaseMock = () => {
  const createSelectChain = (tableName?: string): MockChain => {
    const chain: MockChain = {
      select: mock(() => chain),
      eq: mock(() => chain),
      or: mock(() => chain),
      order: mock(() => chain),
      range: mock(() => chain),
      single: mock(() => {
        if (tableName === "profiles") {
          return Promise.resolve({
            data: mockState.profile,
            error: mockState.dbError,
          });
        }
        if (tableName === "posts") {
          return Promise.resolve({
            data: mockState.listing,
            error: mockState.dbError,
          });
        }
        if (tableName === "roles") {
          return Promise.resolve({
            data: mockState.roleData,
            error: mockState.dbError,
          });
        }
        return Promise.resolve({ data: null, error: mockState.dbError });
      }),
      update: mock(() => ({
        eq: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
      })),
      delete: mock(() => ({
        eq: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
      })),
      upsert: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
      insert: mock(() => Promise.resolve({ data: null, error: mockState.dbError })),
    };

    // For user_roles table (array result)
    if (tableName === "user_roles") {
      Object.assign(chain, {
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: mockState.userRoles,
            error: mockState.dbError,
          }),
      });
    }

    // For profiles list query
    if (tableName === "profiles" && mockState.usersData.length > 0) {
      Object.assign(chain, {
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: mockState.usersData,
            count: mockState.usersCount,
            error: mockState.dbError,
          }),
      });
    }

    return chain;
  };

  return {
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
  };
};

// Mock Supabase server
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => Promise.resolve(createSupabaseMock())),
  createCachedClient: mock(() => Promise.resolve(createSupabaseMock())),
  createServerClient: mock(() => Promise.resolve(createSupabaseMock())),
}));

// Mock Supabase admin (used by checkUserIsAdmin)
mock.module("@/lib/supabase/admin", () => ({
  createAdminClient: mock(() => createSupabaseMock()),
}));

// Mock admin-check directly (overrides any global mock and ensures isolation)
mock.module("@/lib/data/admin-check", () => ({
  checkUserIsAdmin: mock((_userId: string) => {
    const hasAdminRole = mockState.userRoles?.some(
      (ur: { roles: { name: string } }) =>
        ur.roles.name === "admin" || ur.roles.name === "superadmin"
    );
    return Promise.resolve({ isAdmin: hasAdminRole || false });
  }),
}));

// Import actions after mocks
import {
  approveListing,
  rejectListing,
  updateUserRole,
  banUser,
  unbanUser,
  getUsers,
} from "@/app/actions/admin";

// Helper type to extract error from failed result
type FailedResult = { success: false; error: { message: string; code: string } };

// Type guard for failed results
function isFailedResult(result: { success: boolean }): result is FailedResult {
  return result.success === false;
}

describe("Admin Server Actions", () => {
  beforeEach(() => {
    mockState.user = null;
    mockState.profile = null;
    mockState.userRoles = null;
    mockState.listing = null;
    mockState.roleData = null;
    mockState.authError = null;
    mockState.dbError = null;
    mockState.usersData = [];
    mockState.usersCount = 0;
  });

  // ==========================================================================
  // verifyAdminAccess Tests (via action calls)
  // ==========================================================================

  describe("Admin Access Verification", () => {
    it("should reject unauthenticated users", async () => {
      mockState.user = null;

      const result = await approveListing(1);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "You must be logged in" });
      }
    });

    it("should reject non-admin users", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await approveListing(1);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Admin access required" });
      }
    });

    it("should allow admin users", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
      mockState.listing = { id: 1, post_name: "Test Listing", profile_id: "owner-123" };

      const result = await approveListing(1);

      expect(result.success).toBe(true);
    });

    it("should allow superadmin users", async () => {
      mockState.user = { id: "super-123", email: "super@example.com" };
      mockState.userRoles = [{ roles: { name: "superadmin" } }];
      mockState.listing = { id: 1, post_name: "Test Listing", profile_id: "owner-123" };

      const result = await approveListing(1);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // approveListing Tests
  // ==========================================================================

  describe("approveListing", () => {
    beforeEach(() => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should approve valid listing", async () => {
      mockState.listing = { id: 1, post_name: "Food Item", profile_id: "owner-123" };

      const result = await approveListing(1);

      expect(result.success).toBe(true);
    });

    it("should reject invalid listing ID", async () => {
      const result = await approveListing(0);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid listing ID" });
      }
    });

    it("should reject negative listing ID", async () => {
      const result = await approveListing(-1);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid listing ID" });
      }
    });

    it("should return not found for non-existent listing", async () => {
      mockState.listing = null;

      const result = await approveListing(999);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Listing not found" });
      }
    });

    it("should handle database error", async () => {
      mockState.listing = { id: 1, post_name: "Test", profile_id: "owner-123" };
      mockState.dbError = { message: "Database connection failed" };

      const result = await approveListing(1);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // rejectListing Tests
  // ==========================================================================

  describe("rejectListing", () => {
    beforeEach(() => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should reject listing with valid reason", async () => {
      mockState.listing = { id: 1, post_name: "Food Item", profile_id: "owner-123" };

      const result = await rejectListing(1, "Inappropriate content");

      expect(result.success).toBe(true);
    });

    it("should fail with empty reason", async () => {
      const result = await rejectListing(1, "");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Rejection reason is required");
      }
    });

    it("should fail with invalid listing ID", async () => {
      const result = await rejectListing(0, "Some reason");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid listing ID");
      }
    });

    it("should return not found for non-existent listing", async () => {
      mockState.listing = null;

      const result = await rejectListing(999, "Reason");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Listing not found" });
      }
    });
  });

  // ==========================================================================
  // updateUserRole Tests
  // ==========================================================================

  describe("updateUserRole", () => {
    const validUserId = "550e8400-e29b-41d4-a716-446655440001";
    const adminId = "550e8400-e29b-41d4-a716-446655440099";

    beforeEach(() => {
      mockState.user = { id: adminId, email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should update user role successfully", async () => {
      mockState.roleData = { id: "role-123" };

      const result = await updateUserRole(validUserId, "moderator");

      expect(result.success).toBe(true);
    });

    it("should prevent changing own role", async () => {
      const result = await updateUserRole(adminId, "user");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Cannot change your own role" });
      }
    });

    it("should fail with invalid user ID", async () => {
      const result = await updateUserRole("invalid-id", "admin");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid user ID");
      }
    });

    it("should fail with empty role", async () => {
      const result = await updateUserRole(validUserId, "");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Role is required");
      }
    });

    it("should fail when role not found", async () => {
      mockState.roleData = null;

      const result = await updateUserRole(validUserId, "nonexistent");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("not found");
      }
    });
  });

  // ==========================================================================
  // banUser Tests
  // ==========================================================================

  describe("banUser", () => {
    const validUserId = "550e8400-e29b-41d4-a716-446655440002";
    const adminId = "550e8400-e29b-41d4-a716-446655440098";

    beforeEach(() => {
      mockState.user = { id: adminId, email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should ban user with valid reason", async () => {
      mockState.profile = {
        id: validUserId,
        first_name: "John",
        second_name: "Doe",
        email: "john@example.com",
        is_active: true,
      };

      const result = await banUser(validUserId, "Violating terms of service");

      expect(result.success).toBe(true);
    });

    it("should prevent banning yourself", async () => {
      const result = await banUser(adminId, "Some reason");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Cannot ban yourself" });
      }
    });

    it("should fail with invalid user ID", async () => {
      const result = await banUser("invalid-id", "Some reason");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Invalid user ID");
      }
    });

    it("should fail with empty reason", async () => {
      const result = await banUser(validUserId, "");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error.message).toContain("Ban reason is required");
      }
    });

    it("should return not found for non-existent user", async () => {
      mockState.profile = null;

      const result = await banUser(validUserId, "Reason");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "User not found" });
      }
    });
  });

  // ==========================================================================
  // unbanUser Tests
  // ==========================================================================

  describe("unbanUser", () => {
    const validUserId = "550e8400-e29b-41d4-a716-446655440000";

    beforeEach(() => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should unban banned user", async () => {
      mockState.profile = {
        id: validUserId,
        first_name: "John",
        second_name: "Doe",
        email: "john@example.com",
        is_active: false,
      };

      const result = await unbanUser(validUserId);

      expect(result.success).toBe(true);
    });

    it("should fail if user is already active", async () => {
      mockState.profile = {
        id: validUserId,
        first_name: "John",
        second_name: "Doe",
        email: "john@example.com",
        is_active: true,
      };

      const result = await unbanUser(validUserId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "User is not banned" });
      }
    });

    it("should fail with invalid user ID", async () => {
      const result = await unbanUser("invalid-id");

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Invalid user ID" });
      }
    });

    it("should return not found for non-existent user", async () => {
      mockState.profile = null;

      const result = await unbanUser(validUserId);

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "User not found" });
      }
    });
  });

  // ==========================================================================
  // getUsers Tests
  // ==========================================================================

  describe("getUsers", () => {
    beforeEach(() => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.userRoles = [{ roles: { name: "admin" } }];
    });

    it("should return users with default pagination", async () => {
      mockState.usersData = [
        {
          id: "user-1",
          first_name: "John",
          second_name: "Doe",
          email: "john@example.com",
          created_time: "2024-01-01",
          is_active: true,
        },
      ];
      mockState.usersCount = 1;

      const result = await getUsers();

      expect(result.success).toBe(true);
    });

    it("should reject non-admin users", async () => {
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await getUsers();

      expect(result.success).toBe(false);
      if (isFailedResult(result)) {
        expect(result.error).toMatchObject({ message: "Admin access required" });
      }
    });

    it("should validate page parameter", async () => {
      const result = await getUsers({ page: 0 });

      expect(result.success).toBe(false);
    });

    it("should validate limit parameter", async () => {
      const result = await getUsers({ limit: 200 });

      expect(result.success).toBe(false);
    });

    it("should handle search filter", async () => {
      mockState.usersData = [
        {
          id: "user-1",
          first_name: "John",
          second_name: "Doe",
          email: "john@example.com",
          created_time: "2024-01-01",
          is_active: true,
        },
      ];
      mockState.usersCount = 1;

      const result = await getUsers({ search: "john" });

      expect(result.success).toBe(true);
    });

    it("should handle is_active filter", async () => {
      mockState.usersData = [];
      mockState.usersCount = 0;

      const result = await getUsers({ is_active: true });

      expect(result.success).toBe(true);
    });
  });
});
