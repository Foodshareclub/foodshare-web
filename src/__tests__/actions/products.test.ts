/**
 * Products Data Functions Tests
 * Unit tests for product-related data fetching functions
 *
 * Note: Data functions are in @/lib/data/products, not @/app/actions/products.
 * Server Actions (mutations) cannot re-export data functions due to 'use server' constraints.
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";

// Shared mock state - must be outside mock.module for it to be accessible
const mockState = {
  products: [] as unknown[],
  product: null as unknown,
  error: null as { message: string; code?: string } | null,
};

// Mock cache-keys with all the CACHE_TAGS used by products
mock.module("@/lib/data/cache-keys", () => ({
  CACHE_TAGS: new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (typeof prop === "string") {
        const staticTags: Record<string, string> = {
          PRODUCTS: "products",
          PRODUCT_LOCATIONS: "product-locations",
          PRODUCT_SEARCH: "product-search",
          POST_ACTIVITY: "post-activity",
          POST_ACTIVITY_STATS: "post-activity-stats",
          ADMIN: "admin",
          PROFILES: "profiles",
          NEWSLETTER: "newsletter",
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
    PRODUCTS: 60,
    PRODUCT_DETAIL: 120,
    PRODUCT_LOCATIONS: 300,
  },
  CACHE_PROFILES: { DEFAULT: "default", INSTANT: { expire: 0 } },
  invalidateTag: mock(),
  logCacheOperation: mock(),
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

// Create the mock Supabase client factory
const createMockSupabaseClient = () => {
  // Create a chainable mock that always returns fresh state
  // Must be "thenable" for direct await (like Supabase query builder)
  const createChain = (): unknown => {
    const chain = {
      eq: mock(() => createChain()),
      gt: mock(() => createChain()),
      gte: mock(() => createChain()),
      lt: mock(() => createChain()),
      lte: mock(() => createChain()),
      limit: mock(() => createChain()),
      order: mock(() => createChain()),
      range: mock(() =>
        Promise.resolve({
          data: mockState.products,
          error: mockState.error,
        })
      ),
      single: mock(() =>
        Promise.resolve({
          data: mockState.product,
          error: mockState.error,
        })
      ),
      // Make thenable for direct await
      then: (resolve: (value: unknown) => void) =>
        resolve({
          data: mockState.products,
          error: mockState.error,
        }),
    };
    return chain;
  };

  const mockSelect = mock(() => createChain());

  const mockFrom = mock(() => ({
    select: mockSelect,
  }));

  return {
    from: mockFrom,
  };
};

// Mock the Supabase server module BEFORE any imports
mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() => Promise.resolve(createMockSupabaseClient())),
  createCachedClient: mock(() => createMockSupabaseClient()),
}));

// Import data functions from lib/data (not actions - 'use server' files can't re-export)
import {
  getProducts,
  getAllProducts,
  getProductById,
  getProductLocations,
  getUserProducts,
} from "@/lib/data/products";

describe("Products Data Functions", () => {
  beforeEach(() => {
    mockState.products = [];
    mockState.product = null;
    mockState.error = null;
  });

  // ==========================================================================
  // getProducts Tests
  // ==========================================================================

  describe("getProducts", () => {
    it("should return products filtered by type", async () => {
      const mockProducts = [
        { id: 1, post_name: "Apples", post_type: "food", is_active: true },
        { id: 2, post_name: "Oranges", post_type: "food", is_active: true },
      ];
      mockState.products = mockProducts;

      const result = await getProducts("food");

      expect(result).toEqual(mockProducts);
    });

    it("should return empty array when no products found", async () => {
      mockState.products = [];

      const result = await getProducts("food");

      expect(result).toEqual([]);
    });

    it("should throw error when database fails", async () => {
      mockState.error = { message: "Database error" };

      await expect(getProducts("food")).rejects.toThrow("Database error");
    });
  });

  // ==========================================================================
  // getAllProducts Tests
  // ==========================================================================

  describe("getAllProducts", () => {
    it("should return all active products", async () => {
      const mockProducts = [
        { id: 1, post_name: "Apples", post_type: "food", is_active: true },
        { id: 2, post_name: "Bread", post_type: "food", is_active: true },
      ];
      mockState.products = mockProducts;

      const result = await getAllProducts();

      expect(result).toEqual(mockProducts);
    });

    it("should return empty array when no products exist", async () => {
      mockState.products = [];

      const result = await getAllProducts();

      expect(result).toEqual([]);
    });

    it("should throw error when database fails", async () => {
      mockState.error = { message: "Connection timeout" };

      await expect(getAllProducts()).rejects.toThrow("Connection timeout");
    });
  });

  // ==========================================================================
  // getProductById Tests
  // ==========================================================================

  describe("getProductById", () => {
    it("should return product with reviews when found", async () => {
      const mockProduct = {
        id: 1,
        post_name: "Fresh Apples",
        post_type: "food",
        reviews: [{ id: 1, rating: 5, comment: "Great!" }],
      };
      mockState.product = mockProduct;

      const result = await getProductById(1);

      expect(result).toEqual(mockProduct);
    });

    it("should return null when product not found", async () => {
      mockState.product = null;
      mockState.error = { code: "PGRST116", message: "Not found" };

      const result = await getProductById(999);

      expect(result).toBeNull();
    });

    it("should throw error for non-404 database errors", async () => {
      mockState.error = { code: "OTHER", message: "Server error" };

      await expect(getProductById(1)).rejects.toThrow("Server error");
    });
  });

  // ==========================================================================
  // getProductLocations Tests
  // ==========================================================================

  describe("getProductLocations", () => {
    it("should return locations for map display", async () => {
      const mockLocations = [
        { id: 1, location_json: { lat: 50.0, lng: 14.0 }, post_name: "Apples" },
        { id: 2, location_json: { lat: 50.1, lng: 14.1 }, post_name: "Bread" },
      ];
      mockState.products = mockLocations;

      const result = await getProductLocations("food");

      expect(result).toEqual(mockLocations);
    });

    it("should return empty array when no locations found", async () => {
      mockState.products = [];

      const result = await getProductLocations("food");

      expect(result).toEqual([]);
    });

    it("should throw error when database fails", async () => {
      mockState.error = { message: "Location query failed" };

      await expect(getProductLocations("food")).rejects.toThrow("Location query failed");
    });
  });

  // ==========================================================================
  // getUserProducts Tests
  // ==========================================================================

  describe("getUserProducts", () => {
    it("should return products created by user", async () => {
      const mockProducts = [
        { id: 1, post_name: "My Apples", profile_id: "user-123" },
        { id: 2, post_name: "My Bread", profile_id: "user-123" },
      ];
      mockState.products = mockProducts;

      const result = await getUserProducts("user-123");

      expect(result).toEqual(mockProducts);
    });

    it("should return empty array for user with no products", async () => {
      mockState.products = [];

      const result = await getUserProducts("user-no-products");

      expect(result).toEqual([]);
    });

    it("should throw error when database fails", async () => {
      mockState.error = { message: "User products query failed" };

      await expect(getUserProducts("user-123")).rejects.toThrow("User products query failed");
    });
  });
});
