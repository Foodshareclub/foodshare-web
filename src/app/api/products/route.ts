/**
 * Products API Route
 * Client-safe endpoint for fetching products
 * Optimized caching strategy:
 * - CDN caching with s-maxage for edge servers
 * - stale-while-revalidate for instant responses while revalidating
 * - Vary header for proper cache key differentiation
 * - ETag support for conditional requests
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approximateGeoJSON } from "@/utils/postgis";

// Type for products with location
type ProductWithLocation = {
  id: number;
  location_json?: unknown;
  profile_id?: string;
  [key: string]: unknown;
};

/**
 * Apply location privacy to an array of products
 * Each location is offset by ~100-200m for user safety
 */
function applyLocationPrivacy<T extends ProductWithLocation>(products: T[]): T[] {
  return products.map((item) => ({
    ...item,
    location_json: approximateGeoJSON(item.location_json, item.id),
  }));
}

// Cache durations in seconds - optimized for infinite scroll
const CACHE_DURATIONS = {
  // Paginated products - shorter cache, frequently accessed
  PRODUCTS_PAGINATED: 60, // 1 minute
  // First page gets longer cache (most accessed)
  PRODUCTS_FIRST_PAGE: 120, // 2 minutes
  // Product detail - moderate cache
  PRODUCT_DETAIL: 180, // 3 minutes
  // Locations for map - longer cache (less frequent updates)
  LOCATIONS: 300, // 5 minutes
  // Search results - short cache (dynamic)
  SEARCH: 30, // 30 seconds
  // User products - moderate cache
  USER_PRODUCTS: 60, // 1 minute
} as const;

// Stale-while-revalidate multiplier (serve stale for this long while revalidating)
const SWR_MULTIPLIER = 2;

/**
 * Create response with optimized cache headers
 * Uses stale-while-revalidate for instant responses
 */
function jsonWithCache(
  data: unknown,
  maxAge: number,
  options?: {
    isFirstPage?: boolean;
    etag?: string;
  }
): NextResponse {
  const swr = maxAge * SWR_MULTIPLIER;

  const headers: HeadersInit = {
    // CDN caching with stale-while-revalidate
    "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`,
    // Vary by query params for proper cache differentiation
    Vary: "Accept-Encoding",
  };

  // Add ETag for conditional requests (reduces bandwidth)
  if (options?.etag) {
    headers["ETag"] = options.etag;
  }

  return NextResponse.json(data, { headers });
}

/**
 * Generate simple ETag from data
 */
function generateETag(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const userId = searchParams.get("userId");
  const search = searchParams.get("search");
  const locations = searchParams.get("locations") === "true";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  // Get If-None-Match header for conditional requests
  const ifNoneMatch = request.headers.get("If-None-Match");

  const supabase = await createClient();

  // Get current user ONCE at the start for auth-dependent endpoints
  // This avoids multiple auth calls and improves performance
  const {
    data: { user },
  } = await supabase.auth.getUser();

  try {
    // Get single product by ID
    // Owner sees exact location, others see approximate (~200m offset)
    // IMPORTANT: Uses private cache because response varies by auth
    if (id) {
      const { data, error } = await supabase
        .from("posts_with_location")
        .select("*, reviews(*)")
        .eq("id", parseInt(id))
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return NextResponse.json(null);
        }
        throw error;
      }

      const isOwner = user?.id === data?.profile_id;

      if (isOwner) {
        // Owner sees exact location - private cache (not shared on CDN)
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "private, max-age=60",
            Vary: "Cookie",
          },
        });
      }

      // Non-owner sees approximate location
      // CRITICAL: Use private cache because the owner check makes this auth-dependent
      // Using public cache would risk cache poisoning between owner/non-owner requests
      const responseData = {
        ...data,
        location_json: approximateGeoJSON(data?.location_json, data?.id),
      };
      return NextResponse.json(responseData, {
        headers: {
          "Cache-Control": "private, max-age=180",
          Vary: "Cookie",
        },
      });
    }

    // Get user's products (shorter cache - user-specific)
    // Owner viewing their own products sees exact locations
    // IMPORTANT: Uses private cache because response varies by auth
    if (userId) {
      const { data, error } = await supabase
        .from("posts_with_location")
        .select("*")
        .eq("profile_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const isOwnProducts = user?.id === userId;

      if (isOwnProducts) {
        // Owner sees exact locations - private cache
        return NextResponse.json(data ?? [], {
          headers: {
            "Cache-Control": "private, max-age=60",
            Vary: "Cookie",
          },
        });
      }

      // Others see approximate locations
      // CRITICAL: Use private cache because the owner check makes this auth-dependent
      return NextResponse.json(applyLocationPrivacy(data ?? []), {
        headers: {
          "Cache-Control": "private, max-age=60",
          Vary: "Cookie",
        },
      });
    }

    // Search products (short cache - dynamic)
    // All search results show approximate locations for privacy
    if (search) {
      let query = supabase
        .from("posts_with_location")
        .select("*, reviews(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (type && type !== "all") {
        query = query.eq("post_type", type.toLowerCase());
      }

      query = query.textSearch("post_name", search, { type: "websearch" });

      const { data, error } = await query;
      if (error) throw error;
      // Apply location privacy for search results
      return jsonWithCache(applyLocationPrivacy(data ?? []), CACHE_DURATIONS.SEARCH);
    }

    // Get locations for map (longer cache - less frequent updates)
    // Locations are approximated (~200m) for user privacy/safety
    if (locations) {
      let query = supabase
        .from("posts_with_location")
        .select("id, location_json, post_name, post_type, images")
        .eq("is_active", true);

      if (type && type !== "all") {
        query = query.eq("post_type", type.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply location privacy (~200m approximation) for user safety
      const approximatedData = (data ?? []).map((item) => ({
        ...item,
        location_json: approximateGeoJSON(item.location_json, item.id),
      }));

      return jsonWithCache(approximatedData, CACHE_DURATIONS.LOCATIONS);
    }

    // Handle challenges separately - they come from the challenges table
    if (type === "challenge") {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("challenge_published", true)
        .order("challenge_created_at", { ascending: false });

      if (error) throw error;
      return jsonWithCache(data ?? [], CACHE_DURATIONS.PRODUCTS_PAGINATED);
    }

    // Get products by type with cursor-based pagination
    // Order by id DESC for stable cursor pagination (id is sequential with creation)
    // All paginated results show approximate locations for privacy
    let query = supabase
      .from("posts_with_location")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: false })
      .limit(limit + 1); // Fetch one extra to check hasMore

    if (type && type !== "all") {
      query = query.eq("post_type", type.toLowerCase());
    }

    // Cursor-based pagination: get items with ID less than cursor
    const isFirstPage = !cursor;
    if (cursor) {
      query = query.lt("id", parseInt(cursor));
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data ?? [];
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && resultItems.length > 0 ? resultItems[resultItems.length - 1].id : null;

    // Apply location privacy (~200m approximation) for all paginated results
    const privateItems = applyLocationPrivacy(resultItems);
    const responseData = { data: privateItems, nextCursor, hasMore };
    const etag = generateETag(responseData);

    // Return 304 Not Modified if ETag matches (saves bandwidth)
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": `public, s-maxage=${CACHE_DURATIONS.PRODUCTS_FIRST_PAGE}, stale-while-revalidate=${CACHE_DURATIONS.PRODUCTS_FIRST_PAGE * SWR_MULTIPLIER}`,
        },
      });
    }

    // First page gets longer cache (most frequently accessed)
    // Subsequent pages get shorter cache (less frequently re-accessed)
    const cacheDuration = isFirstPage
      ? CACHE_DURATIONS.PRODUCTS_FIRST_PAGE
      : CACHE_DURATIONS.PRODUCTS_PAGINATED;

    return jsonWithCache(responseData, cacheDuration, {
      isFirstPage,
      etag,
    });
  } catch (error) {
    console.error("Products API error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
