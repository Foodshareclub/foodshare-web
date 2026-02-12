/**
 * Maps Data Layer
 *
 * Cached data fetching functions for map-related data.
 *
 * NOTE: Uses createCachedClient() instead of createClient() because
 * cookies() cannot be called inside cached functions.
 */

import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS, logCacheOperation } from "./cache-keys";
import { createCachedClient } from "@/lib/supabase/server";
import type { LocationType } from "@/types/product.types";
import { approximateGeoJSON } from "@/utils/postgis";

// Re-export types for consumers
export type { LocationType };

// ============================================================================
// Location Privacy Helper
// ============================================================================

/**
 * Apply location approximation to an array of locations for user privacy
 * Each location is offset by ~100-200m using a deterministic algorithm
 * based on the post ID (consistent across requests)
 */
function applyLocationPrivacy(locations: LocationType[]): LocationType[] {
  return locations.map((item) => ({
    ...item,
    location_json: approximateGeoJSON(item.location_json, item.id) as LocationType["location_json"],
  }));
}

// ============================================================================
// Cached Map Data Functions
// ============================================================================

/**
 * Get product locations for map by type with caching
 * Optimized query - only fetches fields needed for map markers
 */
export async function getMapLocations(productType: string): Promise<LocationType[]> {
  cacheLife('product-locations');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS, CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(productType.toLowerCase()));

  const normalizedType = productType.toLowerCase();
  const cacheKey = `map-locations-${normalizedType}`;

  logCacheOperation("miss", cacheKey, { type: normalizedType });
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id, location_json, post_name, post_type, images")
    .eq("post_type", normalizedType)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  logCacheOperation("set", cacheKey, { count: data?.length ?? 0 });
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get all product locations for map (all types)
 * Used for the "all" map view
 */
export async function getAllMapLocations(): Promise<LocationType[]> {
  cacheLife('product-locations');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS);

  logCacheOperation("miss", "all-map-locations");
  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("id, location_json, post_name, post_type, images")
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  logCacheOperation("set", "all-map-locations", { count: data?.length ?? 0 });
  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(data ?? []);
}

/**
 * Get nearby locations within a bounding box
 * Uses PostGIS RPC for efficient spatial queries
 */
export async function getNearbyLocations(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  productType?: string,
  limit: number = 500
): Promise<LocationType[]> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS);

  // Round bounds to reduce cache fragmentation (precision: ~10m)
  const precision = 4;
  const roundedBounds = {
    north: Number(bounds.north.toFixed(precision)),
    south: Number(bounds.south.toFixed(precision)),
    east: Number(bounds.east.toFixed(precision)),
    west: Number(bounds.west.toFixed(precision)),
  };

  const supabase = createCachedClient();

  // Use PostGIS RPC for efficient spatial index query
  const { data, error } = await supabase.rpc("get_posts_in_bounds", {
    min_lng: roundedBounds.west,
    min_lat: roundedBounds.south,
    max_lng: roundedBounds.east,
    max_lat: roundedBounds.north,
    filter_post_type: productType?.toLowerCase() ?? null,
    result_limit: limit,
  });

  if (error) {
    // Fallback to JS filtering if RPC not available (migration not applied)
    console.warn("[getNearbyLocations] RPC failed, falling back to JS filter:", error.message);
    return getNearbyLocationsFallback(bounds, productType);
  }

  // Transform RPC result to LocationType format
  const locations: LocationType[] = (data ?? []).map(
    (item: {
      id: number;
      post_name: string;
      post_type: string;
      images: string[];
      location_json: LocationType["location_json"];
    }) => ({
      id: item.id,
      post_name: item.post_name,
      post_type: item.post_type,
      images: item.images,
      location_json: item.location_json,
    })
  );

  // Apply location privacy (~200m approximation) for user safety
  return applyLocationPrivacy(locations);
}

/**
 * Fallback: Get nearby locations using JS filtering
 * Used when PostGIS RPC is not available
 */
async function getNearbyLocationsFallback(
  bounds: { north: number; south: number; east: number; west: number },
  productType?: string
): Promise<LocationType[]> {
  const supabase = createCachedClient();

  let query = supabase
    .from("posts_with_location")
    .select("id, location_json, post_name, post_type, images")
    .eq("is_active", true);

  if (productType) {
    query = query.eq("post_type", productType.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Filter by bounds in JavaScript
  const filtered = (data ?? []).filter((item) => {
    const loc = item.location_json as { coordinates?: [number, number] } | null;
    if (!loc?.coordinates) return false;
    const [lng, lat] = loc.coordinates;
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
  });

  return applyLocationPrivacy(filtered);
}

/**
 * Get location counts by type for map statistics
 */
export async function getLocationCountsByType(): Promise<Record<string, number>> {
  cacheLife('short');
  cacheTag(CACHE_TAGS.PRODUCT_LOCATIONS);

  const supabase = createCachedClient();

  const { data, error } = await supabase
    .from("posts_with_location")
    .select("post_type")
    .eq("is_active", true)
    .not("location_json", "is", null);

  if (error) throw new Error(error.message);

  // Count by type
  const counts: Record<string, number> = {};
  for (const item of data ?? []) {
    const type = item.post_type || "unknown";
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}
