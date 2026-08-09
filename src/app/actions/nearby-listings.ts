"use server";

/**
 * Server Actions for Nearby Listings
 *
 * Client-side fetching of nearby posts after geolocation detection.
 * Supports keyset (cursor) pagination for infinite scroll.
 *
 * IMPORTANT: the user's configured search radius is now honored exactly — the
 * feed is genuinely scoped to `radius` meters. Radius expansion on scroll is
 * driven by the client (HomeClient), which passes a growing `radius` here.
 */

import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getProductsPaginated } from "@/lib/data/products";
import type { NearbyCursor, NearbyPost } from "@/lib/data/nearby-posts";
import type { InitialProductStateType } from "@/types/product.types";

/** Clamp bounds for the radius the client is allowed to request. */
const MIN_RADIUS_METERS = 100; // 100m
const MAX_RADIUS_METERS = 50000; // 50km hard cap (matches HomeClient MAX_RADIUS)

export interface FetchNearbyListingsParams {
  lat: number;
  lng: number;
  /** Search radius in meters. Honored (clamped to [100, 50000]); no longer ignored. */
  radius?: number;
  postType?: string;
  limit?: number;
  /** Keyset cursor from the previous page, or null for the first page. */
  cursor?: NearbyCursor | null;
}

export interface NearbyListingsResult {
  success: boolean;
  data: NearbyPost[];
  hasMore: boolean;
  nextCursor: NearbyCursor | null;
  /** The radius actually used (after clamping). Lets the client keep its own
   * notion of currentRadius in sync with server-side clamping. */
  radius: number;
  error?: string;
}

/**
 * Fetch nearby listings for client-side location detection.
 * Validates coordinates, clamps radius, and threads the keyset cursor through.
 */
export async function fetchNearbyListings({
  lat,
  lng,
  radius = 5000,
  postType = "food",
  limit = 20,
  cursor = null,
}: FetchNearbyListingsParams): Promise<NearbyListingsResult> {
  // Validate coordinates — never trust client input.
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
    return {
      success: false,
      data: [],
      hasMore: false,
      nextCursor: null,
      radius,
      error: "Invalid coordinates",
    };
  }

  const clampedRadius = Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, radius));

  try {
    const result = await getNearbyPosts({
      lat,
      lng,
      radiusMeters: clampedRadius,
      postType,
      limit,
      cursor,
    });

    return {
      success: true,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      radius: clampedRadius,
    };
  } catch (error) {
    console.error("[fetchNearbyListings] Error:", error);
    return {
      success: false,
      data: [],
      hasMore: false,
      nextCursor: null,
      radius: clampedRadius,
      error: error instanceof Error ? error.message : "Failed to fetch nearby listings",
    };
  }
}

/**
 * Fetch paginated products (non-location case)
 * For infinite scroll on the home page when no location is available.
 *
 * Note: this path still uses id-based keyset pagination (separate scheme from
 * the nearby path). Consolidating them is tracked as a follow-up.
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
