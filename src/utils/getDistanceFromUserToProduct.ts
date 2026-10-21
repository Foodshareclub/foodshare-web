/**
 * Calculate distance between user and product in meters
 * Re-exports calculateDistance from postgis utils for backwards compatibility
 */
export { calculateDistance as geoDistance } from "./postgis";
