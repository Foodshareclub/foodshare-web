/**
 * Admin Server Actions Tests
 * Unit tests for admin management server actions
 */

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
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// Mock cache-keys
jest.mock("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: {
    ADMIN: "admin",
    ADMIN_LISTINGS: "admin-listings",
    PRODUCTS: "products",
    PRODUCT: (id: number) => `product-${id}`,
    PROFILES: "profiles",
  },
  invalidateTag: jest.fn(),
}));

// Define chain type for Supabase mock
interface MockChain {
  select: jest.Mock;
  eq: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  insert: jest.Mock;
}

// Mock Supabase server
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => {
    const createSelectChain = (tableName?: string): MockChain => {
      const chain: MockChain = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        or: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(() => chain),
        single: jest.fn(() => {
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
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: mockState.dbError })),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: mockState.dbError })),
        })),
        upsert: jest.fn(() => Promise.resolve({ data: null, error: mockState.dbError })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: mockState.dbError })),
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

    return Promise.resolve({
      auth: {
        getUser: jest.fn(() =>
          Promise.resolve({
            data: { user: mockState.user },
            error: mockState.authError,
          })
        ),
      },
      from: jest.fn((tableName: string) => createSelectChain(tableName)),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    });
  }),
}));

import { describe, it, expect, beforeEach } from "@jest/globals";

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
    jest.clearAllMocks();
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
