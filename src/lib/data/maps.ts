/**
 * Maps Data Layer
 *
 * Cached data fetching functions for map-related data.
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 *
 * NOTE: Uses createCachedClient() instead of createClient() because
 * cookies() cannot be called inside unstable_cache().
 */

import { unstable_cache } from 'next/cache';
import { createCachedClient } from '@/lib/supabase/server';
import { CACHE_TAGS, CACHE_DURATIONS, logCacheOperation } from './cache-keys';
import type { LocationType } from '@/types/product.types';

// Re-export types for consumers
export type { LocationType };

// ============================================================================
// Cached Map Data Functions
// ============================================================================

/**
 * Get product locations for map by type with caching
 * Optimized query - only fetches fields needed for map markers
 */
export async function getMapLocations(productType: string): Promise<LocationType[]> {
  const normalizedType = productType.toLowerCase();
  const cacheKey = `map-locations-${normalizedType}`;

  return unstable_cache(
    async (): Promise<LocationType[]> => {
      logCacheOperation('miss', cacheKey, { type: normalizedType });
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from('posts_with_location')
        .select('id, location_json, post_name, post_type, images')
        .eq('post_type', normalizedType)
        .eq('is_active', true);

      if (error) throw new Error(error.message);
      logCacheOperation('set', cacheKey, { count: data?.length ?? 0 });
      return data ?? [];
    },
    [cacheKey],
    {
      revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
      tags: [CACHE_TAGS.PRODUCT_LOCATIONS, CACHE_TAGS.PRODUCT_LOCATIONS_BY_TYPE(normalizedType)],
    }
  )();
}

/**
 * Get all product locations for map (all types)
 * Used for the "all" map view
 */
export const getAllMapLocations = unstable_cache(
  async (): Promise<LocationType[]> => {
    logCacheOperation('miss', 'all-map-locations');
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('id, location_json, post_name, post_type, images')
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    logCacheOperation('set', 'all-map-locations', { count: data?.length ?? 0 });
    return data ?? [];
  },
  ['all-map-locations'],
  {
    revalidate: CACHE_DURATIONS.PRODUCT_LOCATIONS,
    tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
  }
);

/**
 * Get nearby locations within a bounding box
 * Useful for viewport-based loading
 */
export async function getNearbyLocations(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  productType?: string
): Promise<LocationType[]> {
  const cacheKey = productType
    ? `nearby-locations-${productType}-${bounds.north}-${bounds.south}-${bounds.east}-${bounds.west}`
    : `nearby-locations-all-${bounds.north}-${bounds.south}-${bounds.east}-${bounds.west}`;

  return unstable_cache(
    async (): Promise<LocationType[]> => {
      const supabase = createCachedClient();

      // Use PostGIS ST_MakeEnvelope for efficient bounding box query
      // Note: This requires the location column to have a spatial index
      let query = supabase
        .from('posts_with_location')
        .select('id, location_json, post_name, post_type, images')
        .eq('is_active', true);

      if (productType) {
        query = query.eq('post_type', productType.toLowerCase());
      }

      const { data, error } = await query;

      if (error) throw new Error(error.message);

      // Filter by bounds in JavaScript (PostGIS filtering would be more efficient)
      // TODO: Add PostGIS bounding box query when RPC function is available
      return (data ?? []).filter((item) => {
        const loc = item.location_json as { coordinates?: [number, number] } | null;
        if (!loc?.coordinates) return false;
        const [lng, lat] = loc.coordinates;
        return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
      });
    },
    [cacheKey],
    {
      revalidate: CACHE_DURATIONS.SHORT, // Shorter cache for viewport queries
      tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
    }
  )();
}

/**
 * Get location counts by type for map statistics
 */
export const getLocationCountsByType = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from('posts_with_location')
      .select('post_type')
      .eq('is_active', true)
      .not('location_json', 'is', null);

    if (error) throw new Error(error.message);

    // Count by type
    const counts: Record<string, number> = {};
    for (const item of data ?? []) {
      const type = item.post_type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }

    return counts;
  },
  ['location-counts-by-type'],
  {
    revalidate: CACHE_DURATIONS.MEDIUM,
    tags: [CACHE_TAGS.PRODUCT_LOCATIONS],
  }
);
