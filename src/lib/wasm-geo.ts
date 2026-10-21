/**
 * WebAssembly-Powered Geospatial & Haversine Distance Engine
 *
 * Direct bridge to `foodshare-geo` WebAssembly module:
 * - Ultra-fast Haversine distance calculations
 * - Batch product distance mapping and sorting
 * - Radius filtering for nearby food bank listings
 * - PostGIS WKT and GeoJSON point parsing
 *
 * The module answers with `{ id, distance }` pairs. The bridge hands each
 * answer back on the item it belongs to, so a caller keeps every field it
 * passed in and gains a `distance`.
 *
 * @module lib/wasm-geo
 */

import { createLogger } from "@/lib/logger";
import { requireFiniteNumber } from "@/lib/wasm-boundary";
import * as WasmGeo from "@/wasm/foodshare-geo/foodshare_geo";

const logger = createLogger("WasmGeo");

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeoItem {
  /** Identifier of the product. Numbers and strings are both accepted. */
  id: string | number;
  /** A PostGIS location: GeoJSON, WKT, or `{ latitude, longitude }`. */
  location?: unknown;
  /** The GeoJSON rendering of the same location, as `location_json` arrives. */
  location_json?: unknown;
  /** The location as a pair of columns, for rows that carry no geometry. */
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

export interface GeoResultItem extends GeoItem {
  /**
   * Distance in kilometres from the reference point. `Infinity` when the
   * product has no location that could be read, which is the same answer
   * the module gives.
   */
  distance: number;
}

/**
 * The prefix PostGIS writes in front of a point to name its spatial
 * reference system, as in `SRID=4326;POINT(8.6821 50.1109)`. The module's
 * WKT reader wants the bare `POINT(...)`, and the app writes the prefixed
 * form, so the prefix comes off before the value is handed over.
 */
const EWKT_SRID_PREFIX = /^SRID=[^;]*;\s*/i;

/** Earth's radius in kilometres, as the module measures it. */
const EARTH_RADIUS_KM = 6371;

function normalizeLocation(location: unknown): unknown {
  if (typeof location !== "string") return location;
  return location.replace(EWKT_SRID_PREFIX, "");
}

/**
 * The location to measure an item by, preferring the shapes that carry a
 * readable point: the GeoJSON rendering, then the geometry, then a pair of
 * columns.
 */
function resolveLocation(item: GeoItem): unknown {
  if (item.location_json != null) return item.location_json;
  if (item.location != null) return item.location;
  if (item.latitude != null && item.longitude != null) {
    return { latitude: item.latitude, longitude: item.longitude };
  }
  return null;
}

/**
 * Read a point out of a location, following the same rules the module
 * follows: a GeoJSON `coordinates` array, a `{ latitude, longitude }` (or
 * `{ lat, lng }`) pair, or a WKT `POINT(lng lat)` string.
 */
function parseCoordinates(location: unknown): GeoCoordinate | null {
  if (location == null) return null;

  if (typeof location === "object") {
    const point = location as {
      coordinates?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      lat?: unknown;
      lng?: unknown;
    };

    if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
      const longitude = Number(point.coordinates[0]);
      const latitude = Number(point.coordinates[1]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }

    const latitude = Number(point.latitude ?? point.lat);
    const longitude = Number(point.longitude ?? point.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }

    return null;
  }

  if (typeof location === "string") {
    const match = /^POINT\s*\(\s*(\S+)\s+(\S+)\s*\)/i.exec(location.trim());
    if (match) {
      const longitude = Number(match[1]);
      const latitude = Number(match[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

/**
 * The distance between two points, measured in JavaScript. This is the
 * fallback for when the module cannot be reached, and it mirrors the
 * module's answer: `Infinity` for a location that cannot be read.
 */
function distanceInKm(userLat: number, userLng: number, location: unknown): number {
  const coordinates = parseCoordinates(location);
  if (!coordinates) return Number.POSITIVE_INFINITY;

  const φ1 = (userLat * Math.PI) / 180;
  const φ2 = (coordinates.latitude * Math.PI) / 180;
  const Δφ = (coordinates.latitude - userLat) / 2;
  const Δλ = (coordinates.longitude - userLng) / 2;

  const a =
    Math.sin(Δφ) * Math.sin(Δφ) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ) * Math.sin(Δλ);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Measure every item, in the order the items were given.
 *
 * The module is asked to do the arithmetic in one crossing of the
 * boundary. Each item is handed over under the index it was given, so the
 * answers can be put back on the right item even when the module reorders
 * them, as the radius filter does.
 */
function measureDistances(userLat: number, userLng: number, items: GeoItem[]): number[] {
  const payload = items.map((item, index) => ({
    id: index,
    location: normalizeLocation(resolveLocation(item)),
  }));

  try {
    const results = WasmGeo.calculate_product_distances(userLat, userLng, payload) as Array<{
      id: number;
      distance: number;
    }>;
    const byIndex = new Map(results.map((result) => [result.id, result.distance]));
    return items.map((_, index) => byIndex.get(index) ?? Number.POSITIVE_INFINITY);
  } catch (error) {
    logger.error(
      "WASM batch distance calculation failed, measuring in JavaScript instead",
      error instanceof Error ? error : new Error(String(error)),
    );
    return items.map((item) => distanceInKm(userLat, userLng, resolveLocation(item)));
  }
}

/**
 * Calculate the Haversine distance between two points in kilometers.
 */
export function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return WasmGeo.distance(
    requireFiniteNumber(lat1, "lat1"),
    requireFiniteNumber(lng1, "lng1"),
    requireFiniteNumber(lat2, "lat2"),
    requireFiniteNumber(lng2, "lng2"),
  );
}

/**
 * Calculate the distance from a point to each of a batch of items.
 *
 * Every item comes back with a `distance` in kilometres, and every other
 * field the caller passed in is still there. An item whose location
 * cannot be read gets an infinite distance, which is what the module
 * reports for it.
 */
export function calculateItemDistances<T extends GeoItem>(
  userLat: number,
  userLng: number,
  items: T[],
): (T & { distance: number })[] {
  const distances = measureDistances(userLat, userLng, items);
  return items.map((item, index) => ({ ...item, distance: distances[index] }));
}

/**
 * Filter items to those within a radius of a point, nearest first.
 *
 * The module does the measuring, the filtering and the ordering, and the
 * bridge hands back the caller's own items with a `distance` attached.
 * Items without a readable location have no distance to a point, so they
 * are not within any radius and are left out.
 */
export function filterItemsWithinRadius<T extends GeoItem>(
  userLat: number,
  userLng: number,
  items: T[],
  radiusKm: number,
): (T & { distance: number })[] {
  const payload = items.map((item, index) => ({
    id: index,
    location: normalizeLocation(resolveLocation(item)),
  }));

  try {
    const results = WasmGeo.filter_within_radius(userLat, userLng, payload, radiusKm) as Array<{
      id: number;
      distance: number;
    }>;
    return results.flatMap((result) => {
      const item = items[result.id];
      return item ? [{ ...item, distance: result.distance }] : [];
    });
  } catch (error) {
    logger.error(
      "WASM radius filter failed, filtering in JavaScript instead",
      error instanceof Error ? error : new Error(String(error)),
    );
    const distances = measureDistances(userLat, userLng, items);
    return items
      .map((item, index) => ({ item, distance: distances[index] }))
      .filter((entry) => entry.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => ({ ...entry.item, distance: entry.distance }));
  }
}

/**
 * Parse a PostGIS location into coordinates.
 *
 * Handles the shapes the app stores: GeoJSON, the `location_json`
 * rendering, a `{ latitude, longitude }` pair, and WKT with or without an
 * `SRID` prefix. Returns `null` for a location that holds no point.
 */
export function parsePostGisLocation(location: unknown): GeoCoordinate | null {
  if (location == null) return null;

  const normalized = normalizeLocation(location);

  try {
    const parsed = WasmGeo.parse_location(normalized) as {
      latitude?: number;
      longitude?: number;
    } | null;
    if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch (error) {
    logger.error(
      "WASM location parsing failed, parsing in JavaScript instead",
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  return parseCoordinates(normalized);
}
