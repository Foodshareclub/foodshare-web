"use server";

/**
 * Server Actions for Nearby Posts
 *
 * Handles mutations and actions related to nearby posts.
 * For data fetching, prefer using lib/data/nearby-posts.ts directly in Server Components.
 */

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";

export interface UpdateUserLocationParams {
  lat: number;
  lng: number;
}

export interface UpdateUserLocationResult {
  success: boolean;
  error?: string;
}

/**
 * Save user's location to their profile
 *
 * This enables:
 * - Default map centering on their location
 * - Personalized nearby post recommendations
 * - Location-based notifications
 */
export async function saveUserLocation({
  lat,
  lng,
}: UpdateUserLocationParams): Promise<UpdateUserLocationResult> {
  // Validate coordinates
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return { success: false, error: "Invalid coordinates" };
  }

  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Update user location using RPC function
    const { error } = await supabase.rpc("update_user_location", {
      user_id: user.id,
      lat,
      lng,
    });

    if (error) {
      console.error("Error saving user location:", error);
      return { success: false, error: error.message };
    }

    // Invalidate nearby posts cache since user location changed
    invalidateTag(CACHE_TAGS.NEARBY_POSTS);

    return { success: true };
  } catch (err) {
    console.error("Error in saveUserLocation:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save location",
    };
  }
}
