/**
 * Products Data Layer
 *
 * Cached data fetching functions for products.
 * Uses 'use cache' directive for server-side caching with tag-based invalidation.
 *
 * NOTE: Uses createCachedClient() instead of createClient() because
 * cookies() cannot be called inside cached functions.
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import { PAGINATION } from "@/lib/constants";
import type { InitialProductStateType, LocationType } from "@/types/product.types";
import { approximateGeoJSON } from "@/utils/postgis";

// Re-export types for consumers
export type { InitialProductStateType, LocationType };

// ============================================================================
// Location Privacy Helper
// ============================================================================

/**
 * Apply location approximation to products for user privacy
 * Each location is offset by ~100-200m using a deterministic algorithm
 * based on the post ID (consistent across requests)
 */
function applyLocationPrivacy<T extends { id: number; location_json?: unknown }>(
  products: T[]
): T[] {
  return products.map((item) => ({
    ...item,
    location_json: approximateGeoJSON(item.location_json, item.id),
  }));
}

/**
 * Apply location approximation to a single product
 */
function applyLocationPrivacySingle<T extends { id: number; location_json?: unknown }>(
  product: T | null
): T | null {
  if (!product) return null;
  return {
    ...product,
    location_json: approximateGeoJSON(product.location_json, product.id),
  };
}

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
 * Cached first page of products by type
 * Extracted so 'use cache' can apply to the entire function
 */
async function getProductsFirstPageCached(
  normalizedType: string,
  limit: number
): Promise<InitialProductStateType[]> {
  'use cache';
  cacheLife('products');
  cacheTag(CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType));

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
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get products by type with cursor-based pagination and caching
 * Uses cursor (last seen ID) for efficient pagination with Supabase
 *
 * Caching strategy:
 * - First page: Cached with 'use cache' (products profile) + tag-based invalidation
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
    return getProductsFirstPageCached(normalizedType, limit);
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
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
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
    // Apply location privacy (~200m approximation) for user safety
    data: applyLocationPrivacy(resultItems),
    nextCursor,
    hasMore,
  };
}

/**
 * Get all active products with caching
 */
export async function getAllProducts(): Promise<InitialProductStateType[]> {
  'use cache';
  cacheLife('products');
  cacheTag(CACHE_TAGS.PRODUCTS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get single product by ID with caching
 * Only returns active products
 */
export async function getProductById(productId: number): Promise<InitialProductStateType | null> {
  'use cache';
  cacheLife('product-detail');
  cacheTag(CACHE_TAGS.PRODUCTS, CACHE_TAGS.PRODUCT(productId));

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
  // Apply location privacy (~200m approximation) for user safety
  // Note: Owner-specific exact location is handled at API route level
  return applyLocationPrivacySingle(data);
}

/**
 * Get product locations for map with caching
 */
export async function getProductLocations(productType: string): Promise<LocationType[]> {
  'use cache';
  cacheLife('product-locations');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS, CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(productType.toLowerCase()));

  const normalizedType = productType.toLowerCase();
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id, location_json, post_name, post_type, images")
    .eq("post_type", normalizedType)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get all product locations for map (all types)
 */
export async function getAllProductLocations(): Promise<LocationType[]> {
  'use cache';
  cacheLife('product-locations');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id, location_json, post_name, post_type, images")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get products by user ID with caching
 * Note: Supabase has a default limit of 1000 rows. We use range() to fetch more.
 * For users with many listings, consider implementing pagination.
 */
export async function getUserProducts(userId: string): Promise<InitialProductStateType[]> {
  'use cache';
  cacheLife('products');
  cacheTag(CACHE_TAGS.PRODUCTS, CACHE_TAGS.USER_PRODUCTS(userId));

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
}

/**
 * Search products with caching (shorter cache due to dynamic nature)
 */
export async function searchProducts(searchWord: string, productSearchType?: string): Promise<InitialProductStateType[]> {
  'use cache';
  cacheLife('short');
  cacheTag(CACHE_TAGS.PRODUCT_SEARCH, CACHE_TAGS.PRODUCTS);

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
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get popular product IDs for static generation
 * Returns most recently created active products
 */
export async function getPopularProductIds(limit: number = 50): Promise<number[]> {
  'use cache';
  cacheLife('long');
  cacheTag(CACHE_TAGS.PRODUCTS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => p.id);
}
