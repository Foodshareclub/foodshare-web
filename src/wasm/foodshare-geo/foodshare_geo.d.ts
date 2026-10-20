/* tslint:disable */
/* eslint-disable */

/**
 * Batch distance calculation with sorting.
 *
 * # Arguments
 * * `user_lat` - User's latitude
 * * `user_lng` - User's longitude
 * * `products` - JS array of products
 * * `max_results` - Maximum results to return (0 for all)
 *
 * # Returns
 * JS array of sorted results
 */
export function calculate_distances_sorted(user_lat: number, user_lng: number, products: any, max_results: number): any;

/**
 * Calculate distances from user location to multiple products.
 *
 * This is the main function that replaces the web worker.
 *
 * # Arguments
 * * `user_lat` - User's latitude
 * * `user_lng` - User's longitude
 * * `products` - JS array of products with id and location fields
 *
 * # Returns
 * JS array of products with added distance field
 */
export function calculate_product_distances(user_lat: number, user_lng: number, products: any): any;

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
 * * `products` - JS array of products
 * * `radius_km` - Maximum distance in kilometers
 *
 * # Returns
 * JS array of filtered and sorted results
 */
export function filter_within_radius(user_lat: number, user_lng: number, products: any, radius_km: number): any;

/**
 * Parse a PostGIS location and return coordinates.
 *
 * # Arguments
 * * `location` - JS value holding the location (GeoJSON object or WKT string)
 *
 * # Returns
 * JS object with lat/lng, or null if parsing fails
 */
export function parse_location(location: any): any;
