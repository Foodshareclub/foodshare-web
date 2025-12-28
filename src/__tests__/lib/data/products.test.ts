/**
 * Products Data Functions Tests
 * Unit tests for product-related data fetching functions
 */

// Shared mock state
const mockState = {
  products: [] as Array<Record<string, unknown>>,
  product: null as Record<string, unknown> | null,
  locations: [] as Array<Record<string, unknown>>,
  productIds: [] as Array<{ id: number }>,
  error: null as { message: string; code?: string } | null,
};

// Mock the approximateGeoJSON utility
jest.mock("@/utils/postgis", () => ({
  approximateGeoJSON: jest.fn((location, _id) => location),
}));

// Mock Supabase client
const createMockSupabaseClient = () => {
  const createProductsChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.lt = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.limit = jest.fn(() =>
      Promise.resolve({
        data: mockState.products,
        error: mockState.error,
      })
    );
    chain.range = jest.fn(() =>
      Promise.resolve({
        data: mockState.products,
        error: mockState.error,
      })
    );
    chain.textSearch = jest.fn(() =>
      Promise.resolve({
        data: mockState.products,
        error: mockState.error,
      })
    );
    chain.single = jest.fn(() =>
      Promise.resolve({
        data: mockState.product,
        error: mockState.error,
      })
    );
    chain.then = (resolve: (value: unknown) => void) =>
      resolve({
        data: mockState.products,
        error: mockState.error,
      });
    return chain;
  };

  return {
    from: jest.fn((table: string) => {
      if (table === "posts") {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() =>
                  Promise.resolve({
                    data: mockState.productIds,
                    error: mockState.error,
                  })
                ),
              })),
            })),
          })),
        };
      }
      return createProductsChain();
    }),
  };
};

// Mock Supabase module
jest.mock("@/lib/supabase/server", () => ({
  createCachedClient: jest.fn(() => createMockSupabaseClient()),
  createClient: jest.fn(() => Promise.resolve(createMockSupabaseClient())),
}));

// Mock Next.js cache
jest.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
}));

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  getProducts,
  getProductsPaginated,
  getAllProducts,
  getProductById,
  getProductLocations,
  getAllProductLocations,
  getUserProducts,
  searchProducts,
  getPopularProductIds,
} from "@/lib/data/products";

describe("Products Data Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.products = [];
    mockState.product = null;
    mockState.locations = [];
    mockState.productIds = [];
    mockState.error = null;
  });

  describe("getProducts", () => {
    it("should return products for a given type", async () => {
      mockState.products = [
        {
          id: 1,
          post_name: "Fresh Apples",
          post_type: "food",
          is_active: true,
          location_json: { type: "Point", coordinates: [14.42, 50.08] },
        },
        {
          id: 2,
          post_name: "Organic Bread",
          post_type: "food",
          is_active: true,
          location_json: { type: "Point", coordinates: [14.43, 50.09] },
        },
      ];

      const result = await getProducts("food");

      expect(result).toHaveLength(2);
      expect(result[0].post_name).toBe("Fresh Apples");
      expect(result[1].post_name).toBe("Organic Bread");
    });

    it("should return empty array when no products found", async () => {
      mockState.products = [];

      const result = await getProducts("food");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Database connection failed" };

      await expect(getProducts("food")).rejects.toThrow("Database connection failed");
    });

    it("should handle pagination with cursor", async () => {
      mockState.products = [
        {
          id: 5,
          post_name: "Older Item",
          post_type: "food",
          is_active: true,
        },
      ];

      const result = await getProducts("food", { cursor: 10, limit: 5 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it("should normalize product type to lowercase", async () => {
      mockState.products = [
        { id: 1, post_name: "Test", post_type: "food", is_active: true },
      ];

      const result = await getProducts("FOOD");

      expect(result).toHaveLength(1);
    });
  });

  describe("getProductsPaginated", () => {
    it("should return paginated results with metadata", async () => {
      mockState.products = [
        { id: 10, post_name: "Item 1", post_type: "food" },
        { id: 9, post_name: "Item 2", post_type: "food" },
        { id: 8, post_name: "Item 3", post_type: "food" },
        { id: 7, post_name: "Extra", post_type: "food" }, // Extra item to indicate hasMore
      ];

      const result = await getProductsPaginated("food", { limit: 3 });

      expect(result.data).toHaveLength(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(8);
    });

    it("should indicate no more items when at end", async () => {
      mockState.products = [
        { id: 2, post_name: "Last Item 1", post_type: "food" },
        { id: 1, post_name: "Last Item 2", post_type: "food" },
      ];

      const result = await getProductsPaginated("food", { limit: 5 });

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Query failed" };

      await expect(getProductsPaginated("food")).rejects.toThrow("Query failed");
    });
  });

  describe("getAllProducts", () => {
    it("should return all active products", async () => {
      mockState.products = [
        { id: 1, post_name: "Item 1", is_active: true },
        { id: 2, post_name: "Item 2", is_active: true },
        { id: 3, post_name: "Item 3", is_active: true },
      ];

      const result = await getAllProducts();

      expect(result).toHaveLength(3);
    });

    it("should return empty array when no products", async () => {
      mockState.products = [];

      const result = await getAllProducts();

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Connection error" };

      await expect(getAllProducts()).rejects.toThrow("Connection error");
    });
  });

  describe("getProductById", () => {
    it("should return product with reviews", async () => {
      mockState.product = {
        id: 1,
        post_name: "Fresh Apples",
        post_type: "food",
        is_active: true,
        reviews: [{ id: 1, rating: 5, comment: "Great!" }],
        location_json: { type: "Point", coordinates: [14.42, 50.08] },
      };

      const result = await getProductById(1);

      expect(result).not.toBeNull();
      expect(result?.post_name).toBe("Fresh Apples");
      expect(result?.reviews).toHaveLength(1);
    });

    it("should return null for non-existent product", async () => {
      mockState.product = null;
      mockState.error = { message: "Not found", code: "PGRST116" };

      const result = await getProductById(999);

      expect(result).toBeNull();
    });

    it("should throw error for other database errors", async () => {
      mockState.error = { message: "Database error", code: "OTHER" };

      await expect(getProductById(1)).rejects.toThrow("Database error");
    });
  });

  describe("getProductLocations", () => {
    it("should return locations for map display", async () => {
      mockState.products = [
        {
          id: 1,
          post_name: "Apples",
          post_type: "food",
          images: ["apple.jpg"],
          location_json: { type: "Point", coordinates: [14.42, 50.08] },
        },
        {
          id: 2,
          post_name: "Bread",
          post_type: "food",
          images: [],
          location_json: { type: "Point", coordinates: [14.43, 50.09] },
        },
      ];

      const result = await getProductLocations("food");

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("location_json");
      expect(result[0]).toHaveProperty("post_name");
    });

    it("should return empty array when no locations", async () => {
      mockState.products = [];

      const result = await getProductLocations("food");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Query failed" };

      await expect(getProductLocations("food")).rejects.toThrow("Query failed");
    });
  });

  describe("getAllProductLocations", () => {
    it("should return all product locations", async () => {
      mockState.products = [
        {
          id: 1,
          post_name: "Food Item",
          post_type: "food",
          location_json: { type: "Point", coordinates: [14.42, 50.08] },
        },
        {
          id: 2,
          post_name: "Thing Item",
          post_type: "thing",
          location_json: { type: "Point", coordinates: [14.43, 50.09] },
        },
      ];

      const result = await getAllProductLocations();

      expect(result).toHaveLength(2);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Connection failed" };

      await expect(getAllProductLocations()).rejects.toThrow("Connection failed");
    });
  });

  describe("getUserProducts", () => {
    it("should return all products for a user", async () => {
      mockState.products = [
        { id: 1, post_name: "User Item 1", profile_id: "user-123" },
        { id: 2, post_name: "User Item 2", profile_id: "user-123" },
        { id: 3, post_name: "User Item 3", profile_id: "user-123" },
      ];

      const result = await getUserProducts("user-123");

      expect(result).toHaveLength(3);
    });

    it("should return empty array for user with no products", async () => {
      mockState.products = [];

      const result = await getUserProducts("user-123");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Query failed" };

      await expect(getUserProducts("user-123")).rejects.toThrow("Query failed");
    });
  });

  describe("searchProducts", () => {
    it("should return matching products", async () => {
      mockState.products = [
        { id: 1, post_name: "Fresh Apples", post_type: "food" },
        { id: 2, post_name: "Apple Pie", post_type: "food" },
      ];

      const result = await searchProducts("apple");

      expect(result).toHaveLength(2);
    });

    it("should filter by product type when specified", async () => {
      mockState.products = [
        { id: 1, post_name: "Food Item", post_type: "food" },
      ];

      const result = await searchProducts("item", "food");

      expect(result).toHaveLength(1);
    });

    it("should search all types when type is 'all'", async () => {
      mockState.products = [
        { id: 1, post_name: "Food", post_type: "food" },
        { id: 2, post_name: "Thing", post_type: "thing" },
      ];

      const result = await searchProducts("item", "all");

      expect(result).toHaveLength(2);
    });

    it("should return empty array when no matches", async () => {
      mockState.products = [];

      const result = await searchProducts("nonexistent");

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Search failed" };

      await expect(searchProducts("test")).rejects.toThrow("Search failed");
    });
  });

  describe("getPopularProductIds", () => {
    it("should return array of product IDs", async () => {
      mockState.productIds = [{ id: 10 }, { id: 9 }, { id: 8 }];

      const result = await getPopularProductIds(3);

      expect(result).toEqual([10, 9, 8]);
    });

    it("should return empty array when no products", async () => {
      mockState.productIds = [];

      const result = await getPopularProductIds();

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      mockState.error = { message: "Query failed" };

      await expect(getPopularProductIds()).rejects.toThrow("Query failed");
    });

    it("should use default limit of 50", async () => {
      mockState.productIds = Array.from({ length: 50 }, (_, i) => ({ id: 50 - i }));

      const result = await getPopularProductIds();

      expect(result).toHaveLength(50);
    });
  });
});
