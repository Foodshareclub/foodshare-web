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
