/**
 * Products Data Layer
 *
 * Reads here are cached with Cache Components (`'use cache'` + `cacheTag` +
 * `cacheLife`), which is what makes the ~250 `invalidateTag` calls in
 * `src/app/actions` mean something. Until the reads declared tags, every one of
 * those calls marked nothing stale, because no cache entry had ever registered
 * a tag — so writes never invalidated anything, while the code read as though
 * they did.
 *
 * Why `createCachedClient()` and not `createClient()`: a cached scope cannot
 * touch request data. `cookies()` inside `'use cache'` is a build error, and the
 * session-bound client reads cookies, so anything cached here must run on the
 * cookie-less client. That is correct for this module — everything below reads
 * publicly visible listings, with RLS doing the scoping.
 *
 * Cache-key safety, since this is the failure mode that does not throw:
 *
 *   - A `'use cache'` key is the build id, a hash of the function's location and
 *     signature, the serialised arguments, and any variable captured from an
 *     enclosing scope. So `productType`, `cursor`, `limit` and `searchTerm` are
 *     all in the key by being arguments, and a caller-scope value would be too.
 *   - The location fuzzing below is seeded on the post id, so a cached entry and
 *     a fresh read produce the same coordinates. Non-deterministic output in a
 *     cached function would make the cache a correctness problem, not a
 *     performance one.
 *
 * `cacheLife` is chosen so the entry can be *prerendered into the static shell*
 * rather than becoming a dynamic hole. Per the bundled Next.js docs an entry is
 * excluded from prerenders when `stale` is under 30s, and excluded from the App
 * Shell when `stale` is under 5 minutes; `expire` under 5 minutes excludes it
 * too. Every profile used here clears all three.
 */

import { PAGINATION } from "@/lib/constants";
import { createCachedClient } from "@/lib/supabase/server";
import type { InitialProductStateType, LocationType } from "@/types/product.types";
import { approximateGeoJSON, parsePostGISPoint } from "@/utils/postgis";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";

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
function applyLocationPrivacy<T extends { id: number; location_json?: unknown }>(products: T[]): T[] {
  return products.map(approximateProductLocation);
}

function approximateProductLocation<T extends { id: number; location_json?: unknown }>(product: T): T {
  const locationJson = approximateGeoJSON(product.location_json, product.id);
  const coordinates = parsePostGISPoint(locationJson);
  return {
    ...product,
    location_json: locationJson,
    ...("location" in product ? { location: null } : {}),
    ...("latitude" in product ? { latitude: coordinates?.latitude ?? null } : {}),
    ...("longitude" in product ? { longitude: coordinates?.longitude ?? null } : {}),
  };
}

/**
 * Apply location approximation to a single product
 */
function applyLocationPrivacySingle<T extends { id: number; location_json?: unknown }>(product: T | null): T | null {
  if (!product) return null;
  return approximateProductLocation(product);
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
  searchTerm?: string;
}

// ============================================================================
// Cached Data Functions
// ============================================================================

/**
 * Cached first page of products by type
 */
async function getProductsFirstPageCached(normalizedType: string, limit: number): Promise<InitialProductStateType[]> {
  "use cache";
  cacheLife("products");
  cacheTag(CACHE_TAGS.PRODUCTS);
  cacheTag(CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType));

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
 * - Subsequent pages: Direct fetch (cursor-specific, not cacheable server-side)
 * - API route handles HTTP caching for client requests
 */
export async function getProducts(
  productType: string,
  options?: PaginationOptions,
): Promise<InitialProductStateType[]> {
  "use cache";
  cacheLife("products");
  cacheTag(CACHE_TAGS.PRODUCTS);

  const normalizedType = productType.toLowerCase();
  cacheTag(CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType));

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
  options?: PaginationOptions,
): Promise<PaginatedResult<InitialProductStateType>> {
  "use cache";
  cacheLife("products");
  cacheTag(CACHE_TAGS.PRODUCTS);

  const normalizedType = productType.toLowerCase();
  cacheTag(CACHE_TAGS.PRODUCTS_BY_TYPE(normalizedType));

  const limit = options?.limit ?? PAGINATION.DEFAULT_PAGE_SIZE;
  const cursor = options?.cursor;

  const supabase = createCachedClient();

  // Order by id DESC for stable cursor pagination
  let query = supabase.from("posts_with_location").select("*").eq("is_active", true);

  if (normalizedType !== "all")
    query = query.eq("post_type", normalizedType === "organisation" ? "business" : normalizedType);

  const searchTerm = typeof options?.searchTerm === "string" ? options.searchTerm.trim() : "";
  if (searchTerm) {
    // Treat user-entered wildcard characters literally, including on later pages.
    const pattern = searchTerm.replace(/[\\%_]/g, "\\$&");
    query = query.ilike("post_name", `%${pattern}%`);
  }

  if (cursor) {
    query = query.lt("id", cursor);
  }

  const { data, error } = await query.order("id", { ascending: false }).limit(limit + 1);

  if (error) throw new Error(error.message);

  const items = data ?? [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore && resultItems.length > 0 ? resultItems[resultItems.length - 1].id : null;

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
 *
 * No `reviews(*)` embed: nothing read `product.reviews`, so the second
 * joined query — every review row of the post, free-text notes included
 * — was pure payload on the most-trafficked route in the app. Ratings
 * come from `getPostRating` instead, which aggregates in the database.
 */
export async function getProductById(productId: number): Promise<InitialProductStateType | null> {
  "use cache";
  cacheLife("product-detail");
  cacheTag(CACHE_TAGS.PRODUCTS);
  cacheTag(CACHE_TAGS.PRODUCT(productId));

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("*")
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

export interface PostRatingCounts {
  /** Mean of every review for the listing, 1..5. Null when unrated. */
  avg_rating: number | null;
  /** Reviews across every score. */
  total_reviews: number;
  /** Number of 5-star reviews (retained for the aggregate histogram). */
  five_star: number;
  /** Number of 4-star reviews. */
  four_star: number;
}

/**
 * Rating histogram for one listing, aggregated in the database.
 *
 * `five_star` / `four_star` are not columns of `posts` and never were, so
 * the `aggregateRating` in the Product JSON-LD resolved to `undefined` on
 * every listing and Google was never shown a star rating. This returns the
 * real numbers. Returns an empty result (not a throw) when unavailable: a
 * missing rating must not take a product page down.
 */
export async function getPostRating(productId: number): Promise<PostRatingCounts> {
  "use cache";
  cacheLife("product-detail");
  // Shares the product tag: a review changes the rating, and the same mutation
  // that invalidates `product-{id}` should take the aggregate with it.
  cacheTag(CACHE_TAGS.PRODUCT(productId));

  const empty: PostRatingCounts = { avg_rating: null, total_reviews: 0, five_star: 0, four_star: 0 };
  if (!Number.isInteger(productId) || productId <= 0) return empty;

  const supabase = createCachedClient();
  const { data, error } = await supabase.rpc("get_post_rating", { p_post_id: productId });

  if (error || !data || data.length === 0) return empty;

  const row = data[0] as Partial<PostRatingCounts> | null;
  const avg = row?.avg_rating;
  return {
    avg_rating: avg == null ? null : Number(avg),
    total_reviews: Number(row?.total_reviews ?? 0),
    five_star: Number(row?.five_star ?? 0),
    four_star: Number(row?.four_star ?? 0),
  };
}

/**
 * Get product locations for map with caching
 */
export async function getProductLocations(productType: string): Promise<LocationType[]> {
  const normalizedType = productType.toLowerCase();
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id,location_json,post_name,post_type,images")
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
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id,location_json,post_name,post_type,images")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Ceiling on one user's own listings in a single management view.
 * Far above any real account, and bounded, so a heavy user cannot make
 * this transfer an unbounded table.
 */
const OWN_LISTINGS_LIMIT = 200;

/** Columns the listing-management views render. `posts` has no `location_json`. */
const OWN_LISTING_COLUMNS =
  "id,post_name,post_description,post_type,post_address,post_stripped_address,images," +
  "is_active,is_arranged,post_views,post_like_counter,created_at,profile_id,version," +
  "available_hours,condition,category_id,fridge_id";

/**
 * A user's own listings — **including the ones they deactivated**.
 *
 * This has to read the `posts` base table, not `posts_with_location`.
 * That view carries `WHERE p.is_active = true`, so a listing the owner
 * hid was unreachable from `/my-posts` and `/user-listings`: it vanished
 * from the page they hid it on, the "Inactive" filter could never match,
 * and the only route back was Supabase Studio. The base table is correct
 * because `posts_select_policy` allows the owner their own rows
 * regardless of `is_active` — the view silently threw that away.
 */
export async function getUserProducts(userId: string): Promise<InitialProductStateType[]> {
  if (!userId) return [];

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts")
    .select(OWN_LISTING_COLUMNS)
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(OWN_LISTINGS_LIMIT);

  if (error) throw new Error(error.message);
  return (data ?? []) as InitialProductStateType[];
}

/**
 * Search products with caching (shorter cache due to dynamic nature)
 */
export async function searchProducts(
  searchWord: string,
  productSearchType?: string,
): Promise<InitialProductStateType[]> {
  const supabase = createCachedClient();

  let query = supabase
    .from("posts_with_location")
    .select("*,reviews(*)")
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
export async function getPopularProductIds(limit = 50): Promise<number[]> {
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((p: { id: number }) => p.id);
}
