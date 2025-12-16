/**
 * PostGIS Utilities for FoodShare
 * Handles coordinate parsing and conversion between PostGIS and lat/lng
 */

export interface PostGISPoint {
  latitude: number;
  longitude: number;
}

/**
 * Parse PostGIS POINT to lat/lng object
 * Handles multiple formats:
 * - GeoJSON object: { type: "Point", coordinates: [lng, lat] }
 * - Raw coordinates object: { coordinates: [lng, lat] }
 * - WKT string: "POINT(lng lat)"
 * - Stringified GeoJSON
 * - WKB hex string (returns null - use ST_AsGeoJSON in query)
 */
export function parsePostGISPoint(location: unknown): PostGISPoint | null {
  if (!location) return null;

  // Handle stringified JSON first
  if (typeof location === "string") {
    // Try to parse as JSON (stringified GeoJSON)
    try {
      const parsed = JSON.parse(location);
      if (parsed && typeof parsed === "object") {
        return parsePostGISPoint(parsed); // Recursively parse the object
      }
    } catch {
      // Not JSON, continue with other formats
    }

    // Try WKT format: "POINT(lng lat)"
    const match = location.match(/POINT\s*\(\s*([^\s]+)\s+([^\s]+)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    // WKB hex format - can't parse directly
    if (/^[0-9A-Fa-f]+$/.test(location)) {
      return null;
    }

    return null;
  }

  // GeoJSON format: { type: "Point", coordinates: [lng, lat] }
  if (typeof location === "object" && location !== null) {
    const obj = location as Record<string, unknown>;

    // Check for coordinates array
    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const [lng, lat] = obj.coordinates as [number, number];
      if (typeof lat === "number" && typeof lng === "number" && isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}

/**
 * Validate coordinate values are within valid ranges
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // Filter out (0, 0) as it's often a default/invalid value
    !(lat === 0 && lng === 0)
  );
}

/**
 * Create PostGIS POINT WKT string from lat/lng
 * Format: "SRID=4326;POINT(longitude latitude)"
 */
export function createPostGISPoint(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 * Returns "X.X km" or "X m" depending on distance
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Location Privacy Configuration
 */
export const LOCATION_PRIVACY = {
  /** Approximation radius in meters (200m for user safety) */
  RADIUS_METERS: 200,
  /** Minimum offset to ensure location is always moved */
  MIN_OFFSET_METERS: 100,
} as const;

/**
 * Approximate a location for privacy by applying a deterministic offset
 * Uses a seeded pseudo-random offset based on the post ID so the
 * approximate location is consistent across requests.
 *
 * @param lat - Original latitude
 * @param lng - Original longitude
 * @param postId - Post ID used as seed for deterministic offset
 * @returns Approximated coordinates with ~100-200m offset
 */
export function approximateLocation(
  lat: number,
  lng: number,
  postId: number
): { lat: number; lng: number } {
  // Seeded pseudo-random number generator (mulberry32)
  // Using post ID ensures same offset for same post across requests
  const seed = postId * 2654435761; // Golden ratio hash
  const random1 = mulberry32(seed);
  const random2 = mulberry32(seed + 1);

  // Random angle between 0 and 2π
  const angle = random1() * 2 * Math.PI;

  // Random distance between MIN_OFFSET and RADIUS (100-200m)
  const distance =
    LOCATION_PRIVACY.MIN_OFFSET_METERS +
    random2() * (LOCATION_PRIVACY.RADIUS_METERS - LOCATION_PRIVACY.MIN_OFFSET_METERS);

  // Convert meters to degrees (approximation)
  // 1 degree latitude ≈ 111,320 meters
  // 1 degree longitude ≈ 111,320 * cos(latitude) meters
  const latOffset = (distance * Math.cos(angle)) / 111320;
  const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}

/**
 * Mulberry32 - Fast seeded PRNG
 * Produces deterministic pseudo-random numbers from a seed
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Apply location approximation to a GeoJSON Point
 * Returns a new GeoJSON object with approximated coordinates
 *
 * @param locationJson - GeoJSON Point object
 * @param postId - Post ID for deterministic offset
 * @returns New GeoJSON with approximated coordinates, or original if invalid
 */
export function approximateGeoJSON(locationJson: unknown, postId: number): unknown {
  if (!locationJson || typeof locationJson !== "object") {
    return locationJson;
  }

  const obj = locationJson as Record<string, unknown>;

  // Check for GeoJSON coordinates array [lng, lat]
  if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
    const [lng, lat] = obj.coordinates as [number, number];

    if (typeof lat === "number" && typeof lng === "number") {
      const approx = approximateLocation(lat, lng, postId);
      return {
        ...obj,
        coordinates: [approx.lng, approx.lat],
      };
    }
  }

  return locationJson;
}
