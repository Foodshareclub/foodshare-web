/**
 * Core Distance Calculations (Haversine + bearings)
 *
 * Extracted from `_shared/distance.ts` — no logic changes.
 */

import { EARTH_RADIUS_KM } from "./constants.ts";
import type { Coordinates } from "./types.ts";

/**
 * Calculate the great-circle distance between two points using the Haversine formula
 *
 * The Haversine formula calculates the shortest distance over the earth's surface,
 * giving an "as-the-crow-flies" distance between the points.
 *
 * @param point1 - First coordinate (lat/lng)
 * @param point2 - Second coordinate (lat/lng)
 * @returns Distance in kilometers
 *
 * @example
 * ```ts
 * const distance = haversineDistance(
 *   { lat: 40.7128, lng: -74.0060 }, // New York
 *   { lat: 51.5074, lng: -0.1278 }   // London
 * );
 * // Returns ~5570.22 km
 * ```
 */
export function haversineDistance(
  point1: Coordinates,
  point2: Coordinates,
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance from raw coordinate numbers
 * Convenience wrapper for haversineDistance
 *
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
}

/**
 * Check if a point is within a given radius of a center point
 *
 * @param point - Point to check
 * @param center - Center of the radius
 * @param radiusKm - Radius in kilometers
 * @returns true if point is within radius
 */
export function isWithinRadius(
  point: Coordinates,
  center: Coordinates,
  radiusKm: number,
): boolean {
  return haversineDistance(point, center) <= radiusKm;
}

/**
 * Calculate the initial bearing from point1 to point2
 *
 * @param point1 - Starting point
 * @param point2 - Destination point
 * @returns Bearing in degrees (0-360, where 0 is North)
 */
export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates,
): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = toDegrees(Math.atan2(y, x));

  // Normalize to 0-360
  return ((bearing % 360) + 360) % 360;
}

/**
 * Get cardinal direction from bearing
 *
 * @param bearing - Bearing in degrees (0-360)
 * @returns Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
export function bearingToCardinal(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Calculate destination point given start, bearing, and distance
 *
 * @param start - Starting coordinates
 * @param bearingDegrees - Bearing in degrees
 * @param distanceKm - Distance in kilometers
 * @returns Destination coordinates
 */
export function destinationPoint(
  start: Coordinates,
  bearingDegrees: number,
  distanceKm: number,
): Coordinates {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearingRad = toRadians(bearingDegrees);

  const lat1 = toRadians(start.lat);
  const lng1 = toRadians(start.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  );

  const lng2 = lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lng2),
  };
}
