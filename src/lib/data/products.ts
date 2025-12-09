/**
 * Products Data Layer
 *
 * Cached data fetching functions for products.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 *
 * NOTE: Uses createCachedClient() instead of createClient() because
 * cookies() cannot be called inside unstable_cache().
 */

import { unstable_cache } from "next/cache";
import { createCachedClient } from "@/lib/supabase/server";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { PAGINATION } from "@/lib/constants";
import type { InitialProductStateType, LocationType } from "@/types/product.types";

// Re-export types for consumers
export type { InitialProductStateType, LocationType };

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface PaginationOptions {
  cursor?: number | null;
  limit?: number;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Get products by type with cursor-based pagination and caching
 * Uses cursor (last seen ID) for efficient pagination with Supabase
 *
 * Caching strategy:
 * - First page: Cached with unstable_cache (2 min) + tag-based invalidation
 * - Subsequent pages: Direct fetch (cursor-specific, not cacheable server-side)
 * - API route handles HTTP caching for client requests
 */
export async function getProducts(
  productType: string,
  options?: PaginationOptions
): Promise<InitialProductStateType[]> {
  const normalizedType = productType.toLowerCase();
  const limit = options?.limit ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const cursor = options?.cursor;

  // For initial page load (no cursor), use cached version
  // This is the most frequently accessed data - optimize for it
  if (!cursor) {
    return unstable_cache(
      async (): Promise<InitialProductStateType[]> => {
        const supabase = createCachedClient();

        // Order by id DESC for stable cursor pagination
        const { data, error } = await supabase
          .from("posts_with_location")
          .select("*")
          .eq("post_type", normalizedType)
          .eq("is_active", true)
          .order("id", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        return data ?? [];
      },
      // Cache key includes type and limit for proper differentiation
      [`products-first-page-${normalizedType}-${limit}`],
      {
        // 2 minutes - matches API cache duration for consistency
        revalidate: 120,
        tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType)],
      }
    )();
  }

  // For subsequent pages, fetch directly (cursor changes per request)
  // HTTP caching at API route level handles client-side caching
  const supabase = createCachedClient();
  const { data, error } = await supabase
    .from("posts_with_location")
    .select("*")
    .eq("post_type", normalizedType)
    .eq("is_active", true)
    .lt("id", cursor) // Cursor-based: get items with ID less than cursor
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Get paginated products with metadata (hasMore, nextCursor)
 * Optimized for infinite scroll - fetches limit+1 to check if more exist
 */
export async function getProductsPaginated(
  productType: string,
  options?: PaginationOptions
): Promise<PaginatedResult<InitialProductStateType>> {
  const normalizedType = productType.toLowerCase();
  const limit = options?.limit ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const cursor = options?.cursor;

  const supabase = createCachedClient();

  // Order by id DESC for stable cursor pagination
  let query = supabase
    .from("posts_with_location")
    .select("*")
    .eq("post_type", normalizedType)
    .eq("is_active", true)
    .order("id", { ascending: false })
    .limit(limit + 1); // Fetch one extra to check hasMore

  if (cursor) {
    query = query.lt("id", cursor);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const items = data ?? [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor =
    hasMore && resultItems.length > 0 ? resultItems[resultItems.length - 1].id : null;

  return {
    data: resultItems,
    nextCursor,
    hasMore,
  };
}

/**
 * Get all active products with caching
 */
export const getAllProducts = unstable_cache(
  async (): Promise<InitialProductStateType[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("posts_with_location")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["all-products"],
  {
    revalidate: CACHE_DURATIONS.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Get single product by ID with caching
 * Only returns active products
 */
export async function getProductById(productId: number): Promise<InitialProductStateType | null> {
  return unstable_cache(
    async (): Promise<InitialProductStateType | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("posts_with_location")
        .select("*, reviews(*)")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw new Error(error.message);
      }
      return data;
    },
    [`product-by-id-${productId}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCT_DETAIL,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(productId)],
    }
  )();
}

/**
 * Get product locations for map with caching
 */
export async function getProductLocations(productType: string): Promise<LocationType[]> {
  const normalizedType = productType.toLowerCase();

  return unstable_cache(
    async (): Promise<LocationType[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("posts_with_location")
        .select("id, location_json, post_name, post_type, images")
        .eq("post_type", normalizedType)
        .eq("is_active", true);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`product-locations-${normalizedType}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
      tags: [CACHE_TAGS.PRODUCT_LOCATIONS, CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(normalizedType)],
    }
  )();
}

/**
 * Get all product locations for map (all types)
 */
export const getAllProductLocations = unstable_cache(
  async (): Promise<LocationType[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("posts_with_location")
      .select("id, location_json, post_name, post_type, images")
      .eq("is_active", true);

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["all-product-locations"],
  {
    revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
    tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
  }
);

/**
 * Get products by user ID with caching
 * Note: Supabase has a default limit of 1000 rows. We use range() to fetch more.
 * For users with many listings, consider implementing pagination.
 */
export async function getUserProducts(userId: string): Promise<InitialProductStateType[]> {
  return unstable_cache(
    async (): Promise<InitialProductStateType[]> => {
      const supabase = createCachedClient();

      // Fetch up to 10000 listings (Supabase default is 1000)
      // For production with heavy users, implement cursor-based pagination
      const { data, error } = await supabase
        .from("posts_with_location")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false })
        .range(0, 9999);

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    [`user-products-${userId}`],
    {
      revalidate: CACHE_DURATIONS.PRODUCTS,
      tags: [CACHE_TAGS.PRODUCTS, CACHE_TAGS.USER_PRODUCTS(userId)],
    }
  )();
}

/**
 * Search products with caching (shorter cache due to dynamic nature)
 */
export const searchProducts = unstable_cache(
  async (searchWord: string, productSearchType?: string): Promise<InitialProductStateType[]> => {
    const supabase = createCachedClient();

    let query = supabase
      .from("posts_with_location")
      .select("*, reviews(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (productSearchType && productSearchType !== "all") {
      query = query.eq("post_type", productSearchType.toLowerCase());
    }

    query = query.textSearch("post_name", searchWord, { type: "websearch" });

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data ?? [];
  },
  ["product-search"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.PRODUCT_SEARCH, CACHE_TAGS.PRODUCTS],
  }
);

/**
 * Get popular product IDs for static generation
 * Returns most recently created active products
 */
export const getPopularProductIds = unstable_cache(
  async (limit: number = 50): Promise<number[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("posts")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => p.id);
  },
  ["popular-product-ids"],
  {
    revalidate: CACHE_DURATIONS.LONG, // 1 hour - for build-time generation
    tags: [CACHE_TAGS.PRODUCTS],
  }
);
