"use server";

/**
 * Server Actions for Nearby Listings
 *
 * Client-side fetching of nearby posts after geolocation detection.
 * Eliminates the double-fetch pattern on the home page.
 * Supports cursor-based pagination for infinite scroll.
 */

import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getProductsPaginated } from "@/lib/data/products";
import type { NearbyPost } from "@/lib/data/nearby-posts";
import type { InitialProductStateType } from "@/types/product.types";

export interface FetchNearbyListingsParams {
  lat: number;
  lng: number;
  radius?: number;
  postType?: string;
  limit?: number;
  cursor?: number | null;
}

export interface NearbyListingsResult {
  success: boolean;
  data: NearbyPost[];
  hasMore: boolean;
  nextCursor: number | null;
  error?: string;
}

/**
 * Fetch nearby listings for client-side location detection
 * Called after browser geolocation resolves, avoiding a full server re-render
 * Supports cursor-based pagination for infinite scroll
 */
export async function fetchNearbyListings({
  lat,
  lng,
  radius = 5000,
  postType = "food",
  limit = 20,
  cursor = null,
}: FetchNearbyListingsParams): Promise<NearbyListingsResult> {
  // Validate coordinates
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { success: false, data: [], hasMore: false, nextCursor: null, error: "Invalid coordinates" };
  }

  try {
    const result = await getNearbyPosts({
      lat,
      lng,
      radiusMeters: Math.max(100, Math.min(100000, radius)),
      postType,
      limit,
      cursor,
    });

    return {
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  } catch (error) {
    console.error("[fetchNearbyListings] Error:", error);
    return {
      success: false,
      data: [],
      hasMore: false,
      nextCursor: null,
      error: error instanceof Error ? error.message : "Failed to fetch nearby listings",
    };
  }
}

/**
 * Fetch paginated products (non-location case)
 * For infinite scroll on the home page when no location is available
 */
export async function fetchProductsPaginated(
  productType: string = "food",
  cursor?: number | null
): Promise<{
  success: boolean;
  data: InitialProductStateType[];
  hasMore: boolean;
  nextCursor: number | null;
  error?: string;
}> {
  try {
    const result = await getProductsPaginated(productType, {
      cursor,
      limit: 20,
    });

    return {
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  } catch (error) {
    console.error("[fetchProductsPaginated] Error:", error);
    return {
      success: false,
      data: [],
      hasMore: false,
      nextCursor: null,
      error: error instanceof Error ? error.message : "Failed to fetch products",
    };
  }
}
