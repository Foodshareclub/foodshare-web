/** Full listing search contract shared by mobile clients. No semantic-search fallback. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HandlerContext } from "../../../_shared/api-handler.ts";
import { ok } from "../../../_shared/handler/responses.ts";
import { ValidationError } from "../../../_shared/errors.ts";
import { fuzzProductCoordinates } from "../location-fuzzer.ts";
import { transformProduct } from "../transformers.ts";
import { type ListingSearchQuery, listingSearchQuerySchema, type ListQuery } from "../schemas.ts";

interface SearchRPCResult {
  items: Record<string, unknown>[];
  totalCount: number;
  categoryBreakdown: Record<string, number>;
  hasMore: boolean;
}

export async function fetchSearchProducts(
  supabase: SupabaseClient,
  query: ListingSearchQuery,
  userId: string | null,
): Promise<SearchRPCResult> {
  const { data, error } = await supabase.rpc("search_food_items", {
    p_latitude: Number(query.lat),
    p_longitude: Number(query.lng),
    p_radius_km: Number(query.radiusKm),
    p_search_query: query.q || null,
    p_category_id: query.categoryId ? Number(query.categoryId) : null,
    p_post_type: query.postType ?? null,
    p_available_only: query.availableOnly === "true",
    p_arranged_only: query.arrangedOnly === "true",
    p_sort_by: query.sortBy,
    p_limit: Number(query.limit),
    p_offset: Number(query.offset),
  });
  if (error) throw error;
  if (
    !data || !Array.isArray(data.items) || !Number.isInteger(data.totalCount) ||
    data.totalCount < 0 || typeof data.hasMore !== "boolean" ||
    !data.categoryBreakdown || typeof data.categoryBreakdown !== "object"
  ) throw new Error("Invalid listing search response");

  const result = data as SearchRPCResult;
  return {
    ...result,
    items: result.items.map((item) => {
      const transformed = transformProduct({
        ...item,
        distance_meters: typeof item.distance_km === "number" ? item.distance_km * 1000 : null,
        updated_at: item.updated_at ?? item.created_at,
      });
      const product = fuzzProductCoordinates(transformed, userId);
      if (!userId || item.profile_id !== userId) {
        // Search must not expose a private pickup address along with approximate coordinates.
        product.post_address = item.post_stripped_address ?? null;
      }
      return product;
    }),
  };
}

export async function searchProducts(ctx: HandlerContext<unknown, ListQuery>): Promise<Response> {
  // Re-read raw query: the broad listing schema strips unknown keys before routing.
  const values: Record<string, string> = {};
  new URL(ctx.request.url).searchParams.forEach((value, key) => {
    values[key] = value;
  });
  const parsed = listingSearchQuerySchema.safeParse(values);
  if (!parsed.success) {
    throw new ValidationError("Unsupported or invalid listing search filters", parsed.error.issues);
  }
  const result = await fetchSearchProducts(ctx.supabase, parsed.data, ctx.userId);
  const response = ok(result, ctx);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
