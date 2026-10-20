/**
 * Public Statistics Data Layer
 *
 * Platform-wide counts for the homepage: hero stats and per-category listing
 * counts. These are the only aggregates a visitor who has not signed in can
 * see, and they are read through `createCachedClient()` — the anon client —
 * so RLS is the only thing scoping them, exactly like the public feed.
 *
 * Why `'use cache'` matters here specifically: the homepage is the
 * highest-traffic route in the app, and without a cached entry every first
 * paint would run up to a dozen count queries against Postgres. The entry
 * is prerender-eligible (`stale` 300s), so the counts are baked into the
 * static shell rather than becoming a dynamic hole.
 *
 * `profiles_public`, not `profiles`: the anon role cannot read `profiles`
 * (owner-or-admin since the Phase 2 exposure fix), and counting the public
 * projection is the same number — one row per publicly visible member.
 */

import { createCachedClient } from "@/lib/supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "./cache-keys";

// ============================================================================
// Types
// ============================================================================

export interface PublicStats {
  /** Listings currently available (active and not yet arranged). */
  activeListings: number;
  /** Publicly visible members. */
  members: number;
  /** Listings that found someone to take them. */
  arrangedListings: number;
  /** Estimated food kept in circulation: ~2 kg per arranged listing, the
   * same estimate `getAnalyticsSummary` uses, so the two never disagree. */
  foodSavedKg: number;
}

export interface CategoryCount {
  /** Database `post_type`. */
  type: string;
  /** Active listings of this type. */
  count: number;
}

/**
 * Post types surfaced in the homepage category grid, in display order.
 * `business` is the database type behind the `/organisation` route — the same
 * mapping `getProductsPaginated` applies.
 */
export const HOMEPAGE_CATEGORY_TYPES = [
  "food",
  "thing",
  "borrow",
  "wanted",
  "fridge",
  "foodbank",
  "volunteer",
  "vegan",
  "zerowaste",
  "business",
] as const;

// ============================================================================
// Cached Reads
// ============================================================================

/**
 * Platform-wide public stats for the homepage hero.
 *
 * Three counts, one round trip each, in parallel. A count that fails throws
 * rather than rendering as zero: a hero that says "0 members" because a query
 * failed is a worse defect than a hero that fails to render.
 */
export async function getPublicStats(): Promise<PublicStats> {
  "use cache";
  cacheLife("public-stats");
  cacheTag(CACHE_TAGS.PUBLIC_STATS);

  const supabase = createCachedClient();

  const [activeListings, arrangedListings, members] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_active", true).eq("is_arranged", false),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_arranged", true),
    supabase.from("profiles_public").select("id", { count: "exact", head: true }),
  ]);

  if (activeListings.error) throw new Error(activeListings.error.message);
  if (arrangedListings.error) throw new Error(arrangedListings.error.message);
  if (members.error) throw new Error(members.error.message);

  const arranged = arrangedListings.count || 0;

  return {
    activeListings: activeListings.count || 0,
    members: members.count || 0,
    arrangedListings: arranged,
    foodSavedKg: arranged * 2,
  };
}

/**
 * Active listing count per homepage category.
 *
 * One head-count per type, in parallel, inside a single cached entry — the
 * same shape `getAnalyticsSummary` uses for the admin dashboard. Twelve
 * serialised round trips would be the alternative, and the whole point of
 * the cache entry is that they happen once per window, not once per visitor.
 */
export async function getCategoryCounts(): Promise<CategoryCount[]> {
  "use cache";
  cacheLife("public-stats");
  cacheTag(CACHE_TAGS.PUBLIC_STATS);

  const supabase = createCachedClient();

  const results = await Promise.all(
    HOMEPAGE_CATEGORY_TYPES.map(async (type) => {
      const { count, error } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("post_type", type)
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return { type, count: count || 0 };
    }),
  );

  return results;
}
