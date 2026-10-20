/* oxlint-disable unicorn/no-thenable -- Supabase query builder mocks must be thenable. */
/**
 * Profiles Data Functions Tests
 * Unit tests for profile-related data fetching functions
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// Shared mock state
const mockState = {
  profile: null as Record<string, unknown> | null,
  /** Tables the data layer queried, in order. */
  queried: [] as string[],
  publicProfile: null as Record<string, unknown> | null,
  products: [] as Array<{ count: number }>,
  activeProducts: [] as Array<{ count: number }>,
  reviews: [] as Array<{ reviewed_rating: number }>,
  userRoles: [] as Array<{ roles: { name: string } }>,
  volunteers: [] as Array<Record<string, unknown>>,
  profileReviews: [] as Array<Record<string, unknown>>,
  reviewsError: null as { message: string; code?: string } | null,
  error: null as { message: string; code?: string } | null,
};

// Mock Supabase client
const createMockSupabaseClient = () => {
  const createChain = (resolveData: unknown = null) => {
    const chain: Record<string, unknown> = {};
    chain.select = mock(() => chain);
    chain.eq = mock(() => chain);
    chain.in = mock(() => chain);
    chain.order = mock(() => chain);
    chain.maybeSingle = mock(() =>
      Promise.resolve({
        data: mockState.userRoles.length > 0 ? mockState.userRoles[0] : null,
        error: null,
      }),
    );
    chain.single = mock(() =>
      Promise.resolve({
        data: resolveData,
        error: mockState.error,
      }),
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
    from: mock((table: string) => {
      mockState.queried.push(table);
      switch (table) {
        // The public projection is a different table with a different column
        // set, and getPublicProfile reads it. Treating it as `profiles` would
        // hide a regression where a public read went back to the base table.
        case "profiles":
        case "profiles_public":
          return createChain(mockState.profile || mockState.volunteers);
        case "posts":
          // Two distinct queries: unfiltered total, and `.eq(is_active, true)`.
          // The chain shape is what tells them apart.
          return {
            select: mock(() => ({
              eq: mock(() => ({
                eq: mock(() =>
                  Promise.resolve({
                    count: mockState.activeProducts.length,
                    error: null,
                  }),
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
            select: mock(() => ({
              eq: mock(() => ({
                order: mock(() =>
                  Promise.resolve({
                    data: mockState.profileReviews,
                    error: mockState.error,
                  }),
                ),
                then: (resolve: (value: unknown) => void) =>
                  resolve({
                    data: mockState.reviews,
                    error: mockState.reviewsError,
                  }),
              })),
            })),
          };
        case "user_roles":
          return {
            select: mock(() => ({
              eq: mock(() => ({
                eq: mock(() => ({
                  maybeSingle: mock(() =>
                    Promise.resolve({
                      data: mockState.userRoles.length > 0 ? mockState.userRoles[0] : null,
                      error: null,
                    }),
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

// Mock Supabase module BEFORE imports
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => Promise.resolve(createMockSupabaseClient())),
  createCachedClient: mock(() => createMockSupabaseClient()),
  createServerClient: mock(() => Promise.resolve(createMockSupabaseClient())),
}));

// Import AFTER mocks are set up
import { getProfile, getPublicProfile, getUserRoles, getUserStats, hasUserRole } from "@/lib/data/profiles";

describe("Profiles Data Functions", () => {
  beforeEach(() => {
    mockState.profile = null;
    mockState.publicProfile = null;
    mockState.products = [];
    mockState.activeProducts = [];
    mockState.reviews = [];
    mockState.userRoles = [];
    mockState.volunteers = [];
    mockState.profileReviews = [];
    mockState.reviewsError = null;
    mockState.error = null;
    mockState.queried = [];
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
    it("reads the public projection, never the base table", async () => {
      // `profiles` is readable only by its owner or an admin, and carries
      // email, phone, birth_date and the live verification_code. The public
      // read goes through `profiles_public`, which is a column projection with
      // the location already rounded in the database — so a scraper with the
      // anon key cannot recover the exact point either. Asserting the table is
      // what makes a silent return to `profiles` a test failure.
      mockState.profile = { id: "user-123", first_name: "John" };

      await getPublicProfile("user-123");

      expect(mockState.queried).toEqual(["profiles_public"]);
    });

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
    it("averages reviewed_rating across the user's reviews", async () => {
      mockState.products = [{ count: 1 }, { count: 2 }, { count: 3 }];
      mockState.activeProducts = [{ count: 1 }, { count: 2 }];
      // `reviews` stores the score in `reviewed_rating` and keys the reviewed
      // user as `profile_id`. Selecting a non-existent column makes PostgREST
      // return a 400, which previously surfaced as a confident "0 reviews".
      mockState.reviews = [{ reviewed_rating: 5 }, { reviewed_rating: 4 }, { reviewed_rating: 5 }];

      const result = await getUserStats("user-123");

      expect(result).toEqual({
        totalProducts: 3,
        activeProducts: 2,
        totalReviews: 3,
        averageRating: 4.7,
      });
    });

    it("rounds the average to one decimal place", async () => {
      mockState.products = [{ count: 1 }];
      mockState.activeProducts = [{ count: 1 }];
      mockState.reviews = [{ reviewed_rating: 5 }, { reviewed_rating: 4 }, { reviewed_rating: 3 }];

      const result = await getUserStats("user-123");

      expect(result.averageRating).toBe(4);
    });

    it("ignores non-numeric ratings rather than coercing them to zero", async () => {
      mockState.products = [];
      mockState.activeProducts = [];
      mockState.reviews = [
        { reviewed_rating: 5 },
        { reviewed_rating: null as unknown as number },
        { reviewed_rating: 3 },
      ];

      const result = await getUserStats("user-123");

      expect(result.totalReviews).toBe(2);
      expect(result.averageRating).toBe(4);
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

    it("throws instead of silently reporting zeroes when the query fails", async () => {
      mockState.products = [{ count: 1 }];
      mockState.activeProducts = [{ count: 1 }];
      mockState.reviews = [{ reviewed_rating: 5 }];
      mockState.reviewsError = { message: "column reviews.reviewed_user_id does not exist" };

      await expect(getUserStats("user-123")).rejects.toThrow(/Failed to load reviews for user stats/);
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
