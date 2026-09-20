/**
 * Product API v1 GET Handlers (Feed, List, Single Product)
 */

import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ok, paginated } from "../../../_shared/handler/responses.ts";
import { NotFoundError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { cache } from "../../../_shared/cache.ts";
import {
  parseFloatSafe,
  parseFloatSafeWithBounds,
  parseIntSafe,
} from "../../../_shared/validation-rules.ts";
import { decodeCursor, encodeCursor, normalizeLimit } from "../../../_shared/pagination.ts";
import { aggregateCounts } from "../../../_shared/aggregation.ts";
import { createHealthHandler } from "../../../_shared/health-handler.ts";
import { fuzzProductCoordinates, fuzzProductListCoordinates } from "../location-fuzzer.ts";
import type { ListQuery } from "../schemas.ts";
import { fetchNearbyProducts } from "../nearby-products.ts";
import { transformProduct, transformProductDetail } from "../transformers.ts";

const VERSION = "2.0.0";
const healthCheck = createHealthHandler("api-v1-products", VERSION);

/**
 * Aggregated feed with unread counts
 */
export async function getFeed(
  ctx: HandlerContext<unknown, ListQuery>,
): Promise<Response> {
  const { supabase, userId, query } = ctx;

  if (!userId) {
    throw new ValidationError("Authentication required");
  }

  const lat = parseFloatSafe(query.lat, 0);
  const lng = parseFloatSafe(query.lng, 0);
  const searchRadiusKm = parseFloatSafeWithBounds(query.radiusKm || query.radius, 0.1, 100, 50);
  const limit = normalizeLimit(query.limit);
  const cursor = Math.max(0, parseIntSafe(query.cursor, 0));

  const [listings, counts] = await Promise.all([
    fetchNearbyProducts(supabase, {
      lat,
      lng,
      radiusKm: searchRadiusKm,
      limit,
      offset: cursor,
      postType: query.postType,
      categoryId: query.categoryId ? parseIntSafe(query.categoryId) : undefined,
      userId: query.userId,
    }),
    aggregateCounts(supabase, userId),
  ]);

  const items = listings;
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;

  const fuzzedListings = fuzzProductListCoordinates(resultItems.map(transformProduct), userId);
  const nextCursor = hasMore ? cursor + limit : null;

  return ok({
    listings: fuzzedListings,
    counts,
    hasMore,
    nextCursor,
  }, ctx);
}

/**
 * List products with filters and pagination
 */
export async function listProducts(
  ctx: HandlerContext<unknown, ListQuery>,
): Promise<Response> {
  const { supabase, query } = ctx;

  const cacheKey = `products:list:${ctx.userId ?? "anon"}:${JSON.stringify(query)}`;
  interface CachedListResult {
    items: Record<string, unknown>[];
    total: number;
    nextCursor: string | null;
    limit: number;
  }
  const cached = cache.get<CachedListResult>(cacheKey);
  if (cached) {
    const fuzzedCachedItems = fuzzProductListCoordinates(
      cached.items,
      ctx.userId,
    );
    return paginated(fuzzedCachedItems, ctx, {
      offset: 0,
      limit: cached.limit,
      total: cached.total,
      nextCursor: cached.nextCursor,
    });
  }

  const limit = normalizeLimit(parseIntSafe(query.limit, 20));
  const postType = query.postType;
  const categoryId = query.categoryId ? parseIntSafe(query.categoryId) : undefined;
  const lat = query.lat ? parseFloatSafe(query.lat) : undefined;
  const lng = query.lng ? parseFloatSafe(query.lng) : undefined;
  const radius = parseFloatSafeWithBounds(
    query.radiusKm || query.radius,
    0.1,
    100,
    10,
  );
  const userId = query.userId;

  let dbQuery;
  let isDistanceSorted = false;
  let offset = 0;

  if (lat !== undefined && lng !== undefined) {
    isDistanceSorted = true;
    if (query.cursor) {
      const parsedInt = parseIntSafe(query.cursor, -1);
      if (parsedInt !== -1) {
        offset = parsedInt;
      }
    }

    dbQuery = fetchNearbyProducts(supabase, {
      lat,
      lng,
      radiusKm: radius,
      limit,
      offset: Math.max(0, offset),
      postType,
      categoryId,
      userId,
    }).then((data) => ({ data, error: null, count: null }));
  } else {
    const compositeCursor = query.cursor ? decodeCursor(query.cursor) : null;

    dbQuery = supabase
      .from("posts_with_location")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (postType) {
      dbQuery = dbQuery.eq("post_type", postType);
    }

    if (categoryId) {
      dbQuery = dbQuery.eq("category_id", categoryId);
    }

    if (userId) {
      dbQuery = dbQuery.eq("profile_id", userId);
    }

    if (compositeCursor) {
      dbQuery = dbQuery.or(
        `created_at.lt.${compositeCursor.timestamp},and(created_at.eq.${compositeCursor.timestamp},id.lt.${compositeCursor.id})`,
      );
    }
  }

  const { data, error, count } = await dbQuery;

  if (error) {
    logger.error("Failed to list products", new Error(error.message));
    throw error;
  }

  const items = data || [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, -1) : items;

  let nextCursor: string | null = null;
  if (hasMore) {
    if (isDistanceSorted) {
      nextCursor = String(offset + limit);
    } else {
      const lastItem = resultItems[resultItems.length - 1];
      if (lastItem) {
        nextCursor = encodeCursor({
          timestamp: lastItem.created_at,
          id: String(lastItem.id),
        });
      }
    }
  }

  const transformedItems = resultItems.map(transformProduct);

  cache.set(cacheKey, {
    items: transformedItems,
    total: count || resultItems.length,
    nextCursor,
    limit,
  }, 60_000);

  const fuzzedItems = fuzzProductListCoordinates(transformedItems, ctx.userId);

  return paginated(
    fuzzedItems,
    ctx,
    {
      offset: 0,
      limit,
      total: count || resultItems.length,
      nextCursor,
    },
  );
}

/**
 * Get single product by ID
 */
export async function getProduct(
  ctx: HandlerContext<unknown, ListQuery>,
): Promise<Response> {
  const { supabase, query, userId } = ctx;
  const productId = query.id;

  if (!productId) {
    throw new ValidationError("Product ID is required");
  }

  const includes = query.include?.split(",").map((s) => s.trim()) || [];
  const includeOwner = includes.includes("owner");
  const includeRelated = includes.includes("related");

  // Keep the API aliases while selecting the canonical database columns.
  const profileFields =
    "id, display_name:nickname, first_name, second_name, avatar_url, created_at:created_time" +
    (includeOwner ? ", bio" : "");

  const { data, error } = await supabase
    .from("posts_with_location")
    .select(`
      *,
      profile:profiles!posts_profile_id_fkey(${profileFields}),
      category:categories(id, name, icon:icon_url)
    `)
    .eq("id", productId)
    .returns<Record<string, unknown>[]>()
    .maybeSingle();

  if (error) {
    logger.error("Failed to get product", new Error(error.message));
    throw error;
  }
  if (!data) {
    throw new NotFoundError("Product", productId);
  }

  const result: any = fuzzProductCoordinates(
    transformProductDetail(data),
    userId,
  );

  if (includeRelated && data.latitude && data.longitude) {
    const { data: related } = await supabase
      .from("posts_with_location")
      .select(
        "id,post_name,post_slug,images,post_type,created_at,latitude,longitude,profile_id,canonical_slug",
      )
      .neq("id", productId)
      .eq("is_active", true)
      .or(`category_id.eq.${data.category_id},post_type.eq.${data.post_type}`)
      .limit(6);

    if (related) {
      result.relatedListings = fuzzProductListCoordinates(related.map(transformProduct), userId)
        .map(
          (r) => ({
            id: r.id,
            title: (r.post_name as string) || (r.title as string),
            slug: r.slug as string,
            canonicalSlug: r.canonical_slug as string,
            canonicalUrl: r.canonicalUrl as string,
            imageUrl: (r.images as string[])?.[0],
            postType: r.post_type as string,
            createdAt: r.created_at as string,
            coordinates_approximate: (r as Record<string, unknown>).coordinates_approximate,
          }),
        );
    }
  }

  if (userId && includeOwner) {
    const { data: favorite } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", productId)
      .single();

    result.isFavorited = !!favorite;
    result.canContact = userId !== data.profile_id;
  }

  const response = ok(result, ctx, userId ? undefined : { cacheTTL: 60 });
  if (userId) response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * Route GET requests
 */
export async function handleGet(
  ctx: HandlerContext<unknown, ListQuery>,
): Promise<Response> {
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/health")) {
    return healthCheck(ctx);
  }

  if (ctx.query.mode === "feed") {
    return getFeed(ctx);
  }

  if (ctx.query.id) {
    return getProduct(ctx);
  }

  return listProducts(ctx);
}
