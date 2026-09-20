/**
 * Adapt the v1 numeric-offset API to the canonical keyset RPC.
 * Hydration restores the full product contract (coordinates, category, pickup
 * fields), which the keyset RPC does not return. Filter before counting offsets.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NearbyProductsQuery {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
  offset: number;
  postType?: string;
  categoryId?: number;
  userId?: string;
}

interface NearbyRow {
  id: number;
  distance_meters: number;
}

export async function fetchNearbyProducts(
  supabase: SupabaseClient,
  query: NearbyProductsQuery,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let skipped = 0;
  let cursor: NearbyRow | undefined;
  // The RPC caps page_limit at 100. Fetch the sentinel on a subsequent page
  // when the public endpoint itself requests 100 items.
  const batchSize = 100;
  while (items.length <= query.limit) {
    const { data, error } = await supabase.rpc("get_nearby_posts", {
      user_lat: query.lat,
      user_lng: query.lng,
      radius_meters: query.radiusKm * 1000,
      post_type_filter: query.postType ?? null,
      cursor_distance: cursor?.distance_meters ?? null,
      cursor_id: cursor?.id ?? null,
      page_limit: batchSize,
    });
    if (error) throw error;
    const nearby = (data ?? []) as NearbyRow[];
    if (nearby.length === 0) break;

    let detailsQuery = supabase.from("posts_with_location").select("*")
      .in("id", nearby.map((row) => row.id))
      .eq("is_active", true).eq("is_arranged", false);
    if (query.categoryId !== undefined) {
      detailsQuery = detailsQuery.eq("category_id", query.categoryId);
    }
    if (query.userId) detailsQuery = detailsQuery.eq("profile_id", query.userId);
    const { data: details, error: detailsError } = await detailsQuery;
    if (detailsError) throw detailsError;
    const byId = new Map(
      (details ?? []).map((row: Record<string, unknown>) => [String(row.id), row]),
    );

    for (const nearbyRow of nearby) {
      const product = byId.get(String(nearbyRow.id));
      if (!product) continue;
      if (skipped < query.offset) {
        skipped++;
        continue;
      }
      items.push({ ...product, distance_meters: nearbyRow.distance_meters });
      if (items.length > query.limit) return items;
    }
    if (nearby.length < batchSize) break;
    const last = nearby[nearby.length - 1];
    if (
      !Number.isFinite(last.distance_meters) ||
      (cursor && last.id === cursor.id && last.distance_meters === cursor.distance_meters)
    ) {
      throw new Error("Nearby pagination did not advance");
    }
    cursor = last;
  }
  return items;
}
