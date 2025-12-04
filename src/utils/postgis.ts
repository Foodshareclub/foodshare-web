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
 * - WKT string: "POINT(14.4208 50.0875)"
 * - GeoJSON: { type: "Point", coordinates: [14.4208, 50.0875] }
 * - Raw object: { coordinates: [14.4208, 50.0875] }
 * - WKB hex string from Supabase (decoded via ST_AsGeoJSON)
 */
export function parsePostGISPoint(location: any): PostGISPoint | null {
  if (!location) return null;

  // GeoJSON format (preferred)
  if (typeof location === "object" && location.coordinates && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  }

  // WKT string format
  if (typeof location === "string") {
    // Try WKT format first
    const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    // If it's a hex string (WKB format from Supabase), we can't parse it directly
    // The queries should be updated to use ::json casting instead
    if (location.match(/^[0-9A-Fa-f]+$/)) {
      console.warn(
        "PostGIS: Received WKB hex format. Update query to use ST_AsGeoJSON() or ::json casting for proper parsing."
      );
      return null;
    }
  }

  return null;
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
