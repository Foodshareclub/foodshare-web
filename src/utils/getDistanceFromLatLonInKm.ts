/**
 * Calculate distance between two coordinates in kilometers
 * Wrapper around calculateDistance (meters) from postgis utils
 */
import { calculateDistance } from "./postgis";

export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateDistance(lat1, lon1, lat2, lon2) / 1000;
}
