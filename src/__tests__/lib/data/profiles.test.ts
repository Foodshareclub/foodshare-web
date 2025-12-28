/**
 * Profiles Data Functions Tests
 * Unit tests for profile-related data fetching functions
 */

// Shared mock state
const mockState = {
  profile: null as Record<string, unknown> | null,
  publicProfile: null as Record<string, unknown> | null,
  products: [] as Array<{ count: number }>,
  reviews: [] as Array<{ rating: number }>,
  userRoles: [] as Array<{ roles: { name: string } }>,
  volunteers: [] as Array<Record<string, unknown>>,
  profileReviews: [] as Array<Record<string, unknown>>,
  error: null as { message: string; code?: string } | null,
};

// Mock Supabase client
const createMockSupabaseClient = () => {
  const createChain = (resolveData: unknown = null) => {
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.in = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.maybeSingle = jest.fn(() =>
      Promise.resolve({
        data: mockState.userRoles.length > 0 ? mockState.userRoles[0] : null,
        error: null,
      })
    );
    chain.single = jest.fn(() =>
      Promise.resolve({
        data: resolveData,
        error: mockState.error,
      })
    );
    chain.then = (resolve: (value: unknown) => void) =>
      resolve({
        data: resolveData,
        error: mockState.error,
        count: Array.isArray(resolveData) ? resolveData.length : 0,
      });
    return chain;
  };

  return {
    from: jest.fn((table: string) => {
      switch (table) {
        case "profiles":
          return createChain(mockState.profile || mockState.volunteers);
        case "posts":
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() =>
                  Promise.resolve({
                    count: mockState.products.length,
                    error: null,
                  })
                ),
                then: (resolve: (value: unknown) => void) =>
                  resolve({
                    count: mockState.products.length,
                    error: null,
                  }),
              })),
            })),
          };
        case "reviews":
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() =>
                  Promise.resolve({
                    data: mockState.profileReviews,
                    error: mockState.error,
                  })
                ),
                then: (resolve: (value: unknown) => void) =>
                  resolve({
                    data: mockState.reviews,
                    error: null,
                  }),
              })),
            })),
          };
        case "user_roles":
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn(() =>
                    Promise.resolve({
                      data: mockState.userRoles.length > 0 ? mockState.userRoles[0] : null,
                      error: null,
                    })
                  ),
                })),
                then: (resolve: (value: unknown) => void) =>
                  resolve({
                    data: mockState.userRoles,
                    error: null,
                  }),
              })),
            })),
          };
        default:
          return createChain(null);
      }
    }),
  };
};

// Mock Supabase module
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(() => Promise.resolve(createMockSupabaseClient())),
  createCachedClient: jest.fn(() => createMockSupabaseClient()),
}));

// Mock Next.js cache
jest.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  getProfile,
  getPublicProfile,
  getUserStats,
  getUserRoles,
  hasUserRole,
} from "@/lib/data/profiles";

describe("Profiles Data Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.profile = null;
    mockState.publicProfile = null;
    mockState.products = [];
    mockState.reviews = [];
    mockState.userRoles = [];
    mockState.volunteers = [];
    mockState.profileReviews = [];
    mockState.error = null;
  });

  describe("getProfile", () => {
    it("should return profile when found", async () => {
      mockState.profile = {
        id: "user-123",
        first_name: "John",
        second_name: "Doe",
        email: "john@example.com",
        avatar_url: "avatar.jpg",
        bio: "Hello world",
        phone: "+1234567890",
        location: null,
        is_active: true,
        created_time: "2024-01-01",
        updated_at: "2024-06-01",
      };

      const result = await getProfile("user-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("user-123");
      expect(result?.first_name).toBe("John");
    });

    it("should return null when profile not found", async () => {
      mockState.error = { message: "Not found", code: "PGRST116" };

      const result = await getProfile("nonexistent");

      expect(result).toBeNull();
    });

    it("should throw error for database errors", async () => {
      mockState.error = { message: "Connection error", code: "OTHER" };

      await expect(getProfile("user-123")).rejects.toThrow("Connection error");
    });
  });

  describe("getPublicProfile", () => {
    it("should return public profile fields only", async () => {
      mockState.profile = {
        id: "user-123",
        first_name: "John",
        second_name: "Doe",
        nickname: "johnd",
        avatar_url: "avatar.jpg",
        about_me: "Food sharing enthusiast",
        location: { lat: 50.0, lng: 14.0 },
        created_time: "2024-01-01",
      };

      const result = await getPublicProfile("user-123");

      expect(result).not.toBeNull();
      expect(result?.first_name).toBe("John");
      expect(result?.about_me).toBe("Food sharing enthusiast");
    });

    it("should return null when user not found", async () => {
      mockState.error = { message: "Not found", code: "PGRST116" };

      const result = await getPublicProfile("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getUserStats", () => {
    it("should return user statistics", async () => {
      mockState.products = [{ count: 1 }, { count: 1 }, { count: 1 }];
      mockState.reviews = [{ rating: 5 }, { rating: 4 }, { rating: 5 }];

      const result = await getUserStats("user-123");

      expect(result).toHaveProperty("totalProducts");
      expect(result).toHaveProperty("activeProducts");
      expect(result).toHaveProperty("totalReviews");
      expect(result).toHaveProperty("averageRating");
    });

    it("should handle user with no activity", async () => {
      mockState.products = [];
      mockState.reviews = [];

      const result = await getUserStats("new-user");

      expect(result.totalProducts).toBe(0);
      expect(result.activeProducts).toBe(0);
      expect(result.totalReviews).toBe(0);
      expect(result.averageRating).toBe(0);
    });
  });

  describe("getUserRoles", () => {
    it("should return user roles", async () => {
      mockState.userRoles = [{ roles: { name: "user" } }, { roles: { name: "volunteer" } }];

      const result = await getUserRoles("user-123");

      expect(result).toContain("user");
      expect(result).toContain("volunteer");
    });

    it("should return empty array for user with no roles", async () => {
      mockState.userRoles = [];

      const result = await getUserRoles("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("hasUserRole", () => {
    it("should return true when user has role", async () => {
      mockState.userRoles = [{ roles: { name: "admin" } }];

      const result = await hasUserRole("user-123", "admin");

      expect(result).toBe(true);
    });

    it("should return false when user does not have role", async () => {
      mockState.userRoles = [];

      const result = await hasUserRole("user-123", "admin");

      expect(result).toBe(false);
    });
  });
});
