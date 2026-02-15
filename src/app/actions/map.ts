"use server";

/**
 * Server Actions for Map
 *
 * Viewport-based location loading for map pages.
 * Uses the cached data layer for efficient spatial queries.
 */

import { getNearbyLocations } from "@/lib/data/maps";
import { urlToDbType } from "@/utils/categoryMapping";
import type { LocationType } from "@/types/product.types";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Fetch map locations within viewport bounds
 * Called client-side when the user pans/zooms the map
 */
export async function fetchMapLocationsByBounds(
  bounds: MapBounds,
  productType?: string,
  limit: number = 500
): Promise<LocationType[]> {
  // Validate bounds
  if (
    typeof bounds.north !== "number" ||
    typeof bounds.south !== "number" ||
    typeof bounds.east !== "number" ||
    typeof bounds.west !== "number"
  ) {
    return [];
  }

  try {
    // Convert URL slug (e.g., "foodbanks") to DB type (e.g., "foodbank")
    const dbType = productType ? urlToDbType(productType) : undefined;
    return await getNearbyLocations(bounds, dbType, limit);
  } catch (error) {
    console.error("[fetchMapLocationsByBounds] Error:", error);
    return [];
  }
}
