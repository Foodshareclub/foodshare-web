/* tslint:disable */
/* eslint-disable */

/**
 * Batch distance calculation with sorting.
 *
 * # Arguments
 * * `user_lat` - User's latitude
 * * `user_lng` - User's longitude
 * * `products_json` - JSON string of products
 * * `max_results` - Maximum results to return (0 for all)
 *
 * # Returns
 * JSON string of sorted results
 */
export function calculate_distances_sorted(
  user_lat: number,
  user_lng: number,
  products_json: string,
  max_results: number
): string;

/**
 * Calculate distances from user location to multiple products.
 *
 * This is the main function that replaces the web worker.
 *
 * # Arguments
 * * `user_lat` - User's latitude
 * * `user_lng` - User's longitude
 * * `products_json` - JSON string of products with id and location fields
 *
 * # Returns
 * JSON string of products with added distance field
 */
export function calculate_product_distances(
  user_lat: number,
  user_lng: number,
  products_json: string
): string;

/**
 * Calculate distance between two coordinates.
 *
 * # Arguments
 * * `lat1` - Latitude of first point
 * * `lng1` - Longitude of first point
 * * `lat2` - Latitude of second point
 * * `lng2` - Longitude of second point
 *
 * # Returns
 * Distance in kilometers
 */
export function distance(lat1: number, lng1: number, lat2: number, lng2: number): number;

/**
 * Filter products within a radius.
 *
 * # Arguments
 * * `user_lat` - User's latitude
 * * `user_lng` - User's longitude
 * * `products_json` - JSON string of products
 * * `radius_km` - Maximum distance in kilometers
 *
 * # Returns
 * JSON string of filtered and sorted results
 */
export function filter_within_radius(
  user_lat: number,
  user_lng: number,
  products_json: string,
  radius_km: number
): string;

/**
 * Parse a PostGIS location and return coordinates.
 *
 * # Arguments
 * * `location_json` - JSON string of location (GeoJSON or WKT string)
 *
 * # Returns
 * JSON string with lat/lng, or null if parsing fails
 */
export function parse_location(location_json: string): string;
