/**
 * WebAssembly-Powered Geospatial & Haversine Distance Engine
 *
 * Direct bridge to `foodshare-geo` WebAssembly module:
 * - Ultra-fast Haversine distance calculations
 * - Batch product distance mapping and sorting
 * - Radius filtering for nearby food bank listings
 * - PostGIS WKT and GeoJSON point parsing
 *
 * @module lib/wasm-geo
 */

import * as WasmGeo from "@/wasm/foodshare-geo/foodshare_geo";

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeoItem {
  id: string;
  location?: unknown;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface GeoResultItem extends GeoItem {
  distance?: number;
}

/**
 * Calculate Great Circle (Haversine) distance between two points in kilometers.
 */
export function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return WasmGeo.distance(lat1, lng1, lat2, lng2);
}

/**
 * Calculate distance from user location to a batch of items.
 *
 * The module takes and returns JS arrays; there is no JSON roundtrip.
 */
export function calculateItemDistances<T extends GeoItem>(
  userLat: number,
  userLng: number,
  items: T[],
): (T & { distance?: number })[] {
  try {
    return WasmGeo.calculate_product_distances(userLat, userLng, items) as (T & {
      distance?: number;
    })[];
  } catch (error) {
    console.error("WASM calculateItemDistances failed, falling back:", error);
    return items.map((item) => {
      if (item.latitude != null && item.longitude != null) {
        return {
          ...item,
          distance: calculateHaversineDistance(userLat, userLng, item.latitude, item.longitude),
        };
      }
      return item;
    });
  }
}

/**
 * Filter items within a given radius in kilometers and return sorted by distance.
 */
export function filterItemsWithinRadius<T extends GeoItem>(
  userLat: number,
  userLng: number,
  items: T[],
  radiusKm: number,
): (T & { distance: number })[] {
  try {
    return WasmGeo.filter_within_radius(userLat, userLng, items, radiusKm) as (T & {
      distance: number;
    })[];
  } catch (error) {
    console.error("WASM filterItemsWithinRadius failed:", error);
    return [];
  }
}

/**
 * Parse PostGIS geometry representation (WKT 'POINT(lng lat)' or GeoJSON) into coordinates.
 */
export function parsePostGisLocation(location: unknown): GeoCoordinate | null {
  if (!location) return null;
  try {
    const parsed = WasmGeo.parse_location(location) as {
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
    } | null;
    if (!parsed) return null;
    const latitude = parsed.lat ?? parsed.latitude;
    const longitude = parsed.lng ?? parsed.longitude;
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}
