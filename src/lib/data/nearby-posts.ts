/**
 * Nearby Posts Data Layer
 *
 * PostGIS-powered geo-queries for fetching posts based on user location.
 * Uses Supabase RPC functions with spatial indexes for optimal performance.
 *
 * Key features:
 * - ST_DWithin for efficient radius-based filtering (uses GIST index)
 * - Distance calculation in meters
 * - Cursor-based pagination
 * - Bounding box queries for map viewport loading
 */

import { createClient, createCachedClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface NearbyPostsOptions {
  /** User's latitude */
  lat: number;
  /** User's longitude */
  lng: number;
  /** Search radius in meters (default: 5000 = 5km). Honored exactly — the feed
   * is genuinely scoped to this radius; expansion on scroll is the caller's job. */
  radiusMeters?: number;
  /** Filter by post type (e.g., 'food', 'fridge'). Validated against an allow-list. */
  postType?: string | null;
  /** Number of results per page */
  limit?: number;
  /** Keyset cursor: the (distance, id) of the last post returned on the previous
   * page. null on the first page. Replaces the old OFFSET integer cursor, which
   * was unstable under concurrent writes (skips/dupes). */
  cursor?: NearbyCursor | null;
}

/** Keyset position resuming after a (distance_meters, id) pair. */
export interface NearbyCursor {
  /** distance_meters of the last row on the previous page */
  distance: number;
  /** id of the last row on the previous page */
  id: number;
}

/**
 * Post returned from get_nearby_posts RPC
 * Structurally compatible with InitialProductStateType (a subset) so it can be
 * rendered by ProductGrid without an adapter.
 */
export interface NearbyPost {
  id: number;
  profile_id: string;
  post_name: string;
  post_description: string;
  post_type: string;
  post_address: string;
  post_stripped_address: string | null;
  location_json: { type: string; coordinates: [number, number] } | null;
  images: string[] | null;
  available_hours: string;
  is_active: boolean;
  is_arranged: boolean;
  post_views: number;
  post_like_counter: number;
  condition: string;
  transportation: string;
  created_at: string;
  updated_at: string;
  /** Distance from user in meters */
  distance_meters: number;
}

export interface NearbyPostsResult {
  data: NearbyPost[];
  /** Keyset cursor for the next page, or null when the source is exhausted. */
  nextCursor: NearbyCursor | null;
  hasMore: boolean;
}

export interface PostTypeCount {
  post_type: string;
  count: number;
}

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface MapPost {
  id: number;
  post_name: string;
  post_type: string;
  location_json: { type: string; coordinates: [number, number] } | null;
  images: string[] | null;
  is_arranged: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_RADIUS_METERS = 5000; // 5km — genuinely local first page
const DEFAULT_LIMIT = 20;

/**
 * Canonical post types permitted as a post_type_filter. Keeps unknown/typo'd
 * types from silently returning an empty feed (which masks bugs). 'challenge'
 * is intentionally excluded — challenges have no location and are fetched via
 * a separate path; passing 'challenge' here is treated as "no filter".
 */
const VALID_POST_TYPES = new Set([
  "food",
  "thing",
  "borrow",
  "wanted",
  "fridge",
  "foodbank",
  "business",
  "volunteer",
  "zerowaste",
  "vegan",
  "forum",
]);

/** Normalize and validate a post type. Returns null to mean "no filter"
 *  (incl. for 'challenge', which has no location). Throws on unknown types. */
export function normalizePostType(postType: string | null | undefined): string | null {
  if (!postType) return null;
  const normalized = postType.toLowerCase().trim();
  if (normalized === "challenge") return null;
  if (!VALID_POST_TYPES.has(normalized)) {
    throw new Error(`Invalid post type: ${postType}`);
  }
  return normalized;
}

// ============================================================================
// Nearby Posts Functions
// ============================================================================

/**
 * Get posts near a location, ordered by distance
 *
 * Uses PostGIS ST_DWithin for efficient spatial index utilization.
 * Returns posts within the specified radius, sorted by distance.
 *
 *
 * @example
 * ```ts
 * const { data, hasMore, nextCursor } = await getNearbyPosts({
 *   lat: 51.5074,
 *   lng: -0.1278,
 *   radiusMeters: 5000, // 5km — first page is genuinely local
 *   postType: 'food',
 *   limit: 20
 * });
 * // To fetch the next page, pass nextCursor back as `cursor`.
 * ```
 */
export async function getNearbyPosts(options: NearbyPostsOptions): Promise<NearbyPostsResult> {
  const {
    lat,
    lng,
    radiusMeters = DEFAULT_RADIUS_METERS,
    postType = null,
    limit = DEFAULT_LIMIT,
    cursor = null,
  } = options;

  // Validate post type up front so an unknown type fails loudly, not silently.
  const validatedType = normalizePostType(postType);

  const supabase = await createClient();

  // page_limit is limit+1 so we can detect hasMore without a second round-trip;
  // the RPC's keyset predicate handles resume via cursor_distance/cursor_id.
  const { data, error } = await supabase.rpc("get_nearby_posts", {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusMeters,
    post_type_filter: validatedType,
    cursor_distance: cursor?.distance ?? null,
    cursor_id: cursor?.id ?? null,
    page_limit: limit + 1,
  });

  if (error) {
    throw new Error(`Failed to fetch nearby posts: ${error.message}`);
  }

  const items = (data ?? []) as NearbyPost[];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  // Keyset cursor = the (distance, id) of the last returned row. Combined with
  // ORDER BY distance ASC, id DESC, the next page's resume predicate is:
  //   distance > cursor.distance OR (distance = cursor.distance AND id < cursor.id)
  const last = resultItems[resultItems.length - 1];
  const nextCursor: NearbyCursor | null =
    hasMore && last ? { distance: last.distance_meters, id: last.id } : null;

  return {
    data: resultItems,
    nextCursor,
    hasMore,
  };
}

/**
 * Get count of nearby posts grouped by type
 *
 * Useful for showing badges/stats in the UI (e.g., "5 food items nearby")
 *
 * @example
 * ```ts
 * const counts = await getNearbyPostsCounts({
 *   lat: 51.5074,
 *   lng: -0.1278,
 *   radiusMeters: 10000
 * });
 * // Returns: [{ post_type: 'food', count: 5 }, { post_type: 'fridge', count: 2 }]
 * ```
 */
export async function getNearbyPostsCounts(options: {
  lat: number;
  lng: number;
  radiusMeters?: number;
}): Promise<PostTypeCount[]> {
  const { lat, lng, radiusMeters = DEFAULT_RADIUS_METERS } = options;

  const supabase = createCachedClient();

  const { data, error } = await supabase.rpc("get_nearby_posts_count", {
    user_lat: lat,
    user_lng: lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    throw new Error(`Failed to fetch nearby posts count: ${error.message}`);
  }

  return (data ?? []) as PostTypeCount[];
}

/**
 * Get posts within a map bounding box
 *
 * Optimized for map viewport loading - returns minimal data for markers.
 * Uses PostGIS && operator with ST_MakeEnvelope for efficient bounding box queries.
 *
 * @example
 * ```ts
 * const posts = await getPostsInBounds({
 *   minLat: 51.4,
 *   minLng: -0.2,
 *   maxLat: 51.6,
 *   maxLng: 0.1,
 *   postType: 'food'
 * });
 * ```
 */
export async function getPostsInBounds(options: {
  bounds: BoundingBox;
  postType?: string | null;
  limit?: number;
}): Promise<MapPost[]> {
  const { bounds, postType = null, limit = 100 } = options;

  const supabase = createCachedClient();

  const { data, error } = await supabase.rpc("get_posts_in_bounds", {
    min_lat: bounds.minLat,
    min_lng: bounds.minLng,
    max_lat: bounds.maxLat,
    max_lng: bounds.maxLng,
    post_type_filter: postType,
    page_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to fetch posts in bounds: ${error.message}`);
  }

  return (data ?? []) as MapPost[];
}

/**
 * Update user's saved location for personalized nearby results
 *
 * Stores the user's location in their profile for:
 * - Default map centering
 * - Personalized nearby post recommendations
 * - Location-based notifications
 */
export async function updateUserLocation(userId: string, coordinates: Coordinates): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_user_location", {
    user_id: userId,
    lat: coordinates.lat,
    lng: coordinates.lng,
  });

  if (error) {
    throw new Error(`Failed to update user location: ${error.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format distance for display
 *
 * @example
 * formatDistance(500) // "500 m"
 * formatDistance(1500) // "1.5 km"
 * formatDistance(15000) // "15 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Calculate bounding box from center point and radius
 *
 * Useful for converting a radius search to a bounding box for map display.
 */
export function getBoundingBox(center: Coordinates, radiusMeters: number): BoundingBox {
  // Approximate degrees per meter at the equator
  // This is a simplification - for more accuracy, use proper geodesic calculations
  const latDelta = radiusMeters / 111320; // ~111.32 km per degree latitude
  const lngDelta = radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
