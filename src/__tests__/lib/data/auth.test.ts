/**
 * Auth Data Functions Tests
 * Unit tests for authentication-related data fetching functions
 */

// Shared mock state
const mockState = {
  user: null as { id: string; email: string } | null,
  profile: null as Record<string, unknown> | null,
  userRoles: [] as Array<{ roles: { name: string } }>,
  authError: null as { message: string } | null,
  profileError: null as { message: string } | null,
};

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockSingle = jest.fn(() =>
    Promise.resolve({
      data: mockState.profile,
      error: mockState.profileError,
    })
  );

  const mockSelect = jest.fn(() => ({
    eq: jest.fn(() => ({
      single: mockSingle,
    })),
  }));

  const mockRolesSelect = jest.fn(() => ({
    eq: jest.fn(() =>
      Promise.resolve({
        data: mockState.userRoles,
        error: null,
      })
    ),
  }));

  return {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: mockState.user },
          error: mockState.authError,
        })
      ),
    },
    from: jest.fn((table: string) => {
      if (table === "profiles") {
        return { select: mockSelect };
      }
      if (table === "user_roles") {
        return { select: mockRolesSelect };
      }
      return { select: mockSelect };
    }),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `https://storage.example.com/${path}` },
        })),
      })),
    },
  };
};

// Mock Supabase module
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(createMockSupabaseClient())),
}));

// Mock Next.js cache
jest.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { describe, it, expect, beforeEach } from "@jest/globals";
import { getCurrentUser, checkIsAdmin, getAuthSession } from "@/lib/data/auth";

describe("Auth Data Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.user = null;
    mockState.profile = null;
    mockState.userRoles = [];
    mockState.authError = null;
    mockState.profileError = null;
  });

  describe("getCurrentUser", () => {
    it("should return null when not authenticated", async () => {
      mockState.user = null;

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return user with profile when authenticated", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };
      mockState.profile = {
        id: "user-123",
        first_name: "John",
        second_name: "Doe",
        nickname: "johnd",
        avatar_url: "avatars/user-123.jpg",
        email: "test@example.com",
      };

      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-123");
      expect(result?.email).toBe("test@example.com");
      expect(result?.profile?.first_name).toBe("John");
    });

    it("should return user without profile when profile fetch fails", async () => {
      mockState.user = { id: "user-123", email: "test@example.com" };
      mockState.profileError = { message: "Profile not found" };

      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-123");
      expect(result?.profile).toBeNull();
    });

    it("should return null when auth error occurs", async () => {
      mockState.authError = { message: "Auth session expired" };

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("checkIsAdmin", () => {
    it("should return isAdmin true for admin role", async () => {
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await checkIsAdmin("user-123");

      expect(result.isAdmin).toBe(true);
      expect(result.roles).toContain("admin");
    });

    it("should return isAdmin true for superadmin role", async () => {
      mockState.userRoles = [{ roles: { name: "superadmin" } }];

      const result = await checkIsAdmin("user-123");

      expect(result.isAdmin).toBe(true);
      expect(result.roles).toContain("superadmin");
    });

    it("should return isAdmin false for regular user", async () => {
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await checkIsAdmin("user-123");

      expect(result.isAdmin).toBe(false);
      expect(result.roles).toContain("user");
    });

    it("should return isAdmin false when no roles", async () => {
      mockState.userRoles = [];

      const result = await checkIsAdmin("user-123");

      expect(result.isAdmin).toBe(false);
      expect(result.roles).toEqual([]);
    });
  });

  describe("getAuthSession", () => {
    it("should return unauthenticated session when no user", async () => {
      mockState.user = null;

      const result = await getAuthSession();

      expect(result.isAuthenticated).toBe(false);
      expect(result.user).toBeNull();
      expect(result.isAdmin).toBe(false);
      expect(result.roles).toEqual([]);
    });

    it("should return authenticated session with admin status", async () => {
      mockState.user = { id: "admin-123", email: "admin@example.com" };
      mockState.profile = {
        id: "admin-123",
        first_name: "Admin",
        second_name: "User",
        nickname: null,
        avatar_url: null,
        email: "admin@example.com",
      };
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await getAuthSession();

      expect(result.isAuthenticated).toBe(true);
      expect(result.user?.id).toBe("admin-123");
      expect(result.isAdmin).toBe(true);
      expect(result.roles).toContain("admin");
    });

    it("should return authenticated session for regular user", async () => {
      mockState.user = { id: "user-123", email: "user@example.com" };
      mockState.profile = {
        id: "user-123",
        first_name: "Regular",
        second_name: "User",
        nickname: null,
        avatar_url: null,
        email: "user@example.com",
      };
      mockState.userRoles = [{ roles: { name: "user" } }];

      const result = await getAuthSession();

      expect(result.isAuthenticated).toBe(true);
      expect(result.user?.id).toBe("user-123");
      expect(result.isAdmin).toBe(false);
    });
  });
});
