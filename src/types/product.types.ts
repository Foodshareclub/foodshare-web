/**
 * Product Type Definitions
 * Centralized types for product/post data structures
 */

import type { PostGISGeography, GeoJSONPoint } from './postgis.types';
import { parsePostGISPoint } from '@/utils/postgis';

/**
 * Review type for product reviews
 */
export type ReviewsType = {
  id: number;
  profile_id: string;
  post_id: number;
  forum_id: number;
  challenge_id: number;
  feedback: string;
};

/**
 * Main product/post type from database
 */
export type InitialProductStateType = {
  available_hours: string;
  created_at: string;
  five_star: number | null;
  four_star: number | null;
  images: string[];
  id: number;
  location: PostGISGeography;
  location_json?: GeoJSONPoint | null;
  post_address: string;
  post_stripped_address: string;
  is_arranged: boolean;
  post_description: string;
  post_like_counter: number;
  transportation: string;
  post_name: string;
  post_type: string;
  is_active: boolean;
  post_views: number;
  profile_id: string;
  reviews?: Array<ReviewsType>;
};

/**
 * Location type for map display (subset of product data)
 */
export type LocationType = {
  id: number;
  location?: PostGISGeography;
  location_json?: GeoJSONPoint | null;
  post_name: string;
  post_type?: string;
  images?: string[];
};

/**
 * Helper to get coordinates from product (PostGIS format)
 * Checks location_json (GeoJSON from computed column) first,
 * then falls back to location field for backwards compatibility
 * 
 * Best practice: Use posts_with_location view which provides location_json
 * as proper GeoJSON via ST_AsGeoJSON()
 */
export function getCoordinates(
  product: InitialProductStateType | LocationType
): { lat: number; lng: number } | null {
  // Prefer location_json (GeoJSON from computed column via ST_AsGeoJSON)
  if ('location_json' in product && product.location_json) {
    const parsed = parsePostGISPoint(product.location_json);
    if (parsed) {
      return { lat: parsed.latitude, lng: parsed.longitude };
    }
  }

  // Fallback to location field (may be WKB hex or already parsed)
  // Note: WKB hex format cannot be parsed client-side, use posts_with_location view
  if (product.location) {
    const parsed = parsePostGISPoint(product.location);
    if (parsed) {
      return { lat: parsed.latitude, lng: parsed.longitude };
    }
  }

  return null;
}
