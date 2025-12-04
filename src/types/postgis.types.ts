/**
 * PostGIS Type Definitions
 * Types for handling geographic data from PostGIS/Supabase
 */

/**
 * GeoJSON Point geometry
 * Standard format for geographic points
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [longitude: number, latitude: number];
}

/**
 * Simple coordinate pair
 * Used throughout the application for lat/lng values
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * PostGIS geography type (raw format from database)
 * Can be WKB hex string or GeoJSON object
 */
export type PostGISGeography = string | GeoJSONPoint | null;

/**
 * Parse a GeoJSON Point to Coordinates
 * @param geojson - GeoJSON Point object
 * @returns Coordinates or null if invalid
 */
export function parseGeoJSON(geojson: GeoJSONPoint | null | undefined): Coordinates | null {
  if (!geojson || geojson.type !== 'Point' || !Array.isArray(geojson.coordinates)) {
    return null;
  }
  
  const [longitude, latitude] = geojson.coordinates;
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  
  return { lat: latitude, lng: longitude };
}

/**
 * Convert Coordinates to GeoJSON Point
 * @param coords - Coordinate pair
 * @returns GeoJSON Point object
 */
export function toGeoJSON(coords: Coordinates): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: [coords.lng, coords.lat],
  };
}

/**
 * Parse PostGIS geography to Coordinates
 * Handles both WKB hex strings and GeoJSON objects
 * @param geography - PostGIS geography value
 * @returns Coordinates or null if invalid
 */
export function parsePostGISGeography(geography: PostGISGeography): Coordinates | null {
  if (!geography) {
    return null;
  }
  
  // If it's already a GeoJSON object
  if (typeof geography === 'object' && geography.type === 'Point') {
    return parseGeoJSON(geography);
  }
  
  // If it's a string, try to parse as JSON (some databases return stringified GeoJSON)
  if (typeof geography === 'string') {
    try {
      const parsed = JSON.parse(geography);
      if (parsed && parsed.type === 'Point') {
        return parseGeoJSON(parsed);
      }
    } catch {
      // Not JSON, might be WKB hex - return null for now
      // WKB parsing would require additional library
      return null;
    }
  }
  
  return null;
}

/**
 * Check if coordinates are valid
 * @param coords - Coordinates to validate
 * @returns true if valid
 */
export function isValidCoordinates(coords: Coordinates | null | undefined): coords is Coordinates {
  if (!coords) return false;
  
  const { lat, lng } = coords;
  
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate if two coordinates are approximately equal
 * @param a - First coordinate
 * @param b - Second coordinate
 * @param tolerance - Maximum difference in degrees (default: 0.0001 ≈ 11 meters)
 * @returns true if coordinates are within tolerance
 */
export function coordinatesEqual(
  a: Coordinates | null,
  b: Coordinates | null,
  tolerance: number = 0.0001
): boolean {
  if (!a || !b) return false;
  
  return (
    Math.abs(a.lat - b.lat) < tolerance &&
    Math.abs(a.lng - b.lng) < tolerance
  );
}
