/**
 * Reviews semantics: "given" vs "received".
 *
 * `reviews.profile_id` is the REVIEWER (the insert is RLS-checked to
 * `auth.uid()`, and the client repository documents the split):
 *
 *   fetchReviews(byUserId:)   — reviews they WROTE  (profile_id = user)
 *   fetchReviews(forUserId:)  — reviews they RECEIVED (posts.profile_id = user)
 *
 * The profile page's `rating` is a reputation number (Google
 * aggregateRating semantics, cf. submit-review.ts): it must be computed
 * from reviews RECEIVED — over the user's posts — not from the ratings
 * the user handed out. The old query filtered `reviews.profile_id`,
 * so the profile displayed the average of the ratings the user GAVE as
 * the user's own rating, and `ratingCount` counted the user's own
 * reviews.
 *
 * Pinned here:
 *  - aggregateStats reads received ratings via a posts -> reviews embed;
 *  - null ratings are excluded from the mean;
 *  - the dead `listing_requests` fallback error is logged, not swallowed;
 *  - submitReview invalidates the REVIEWER's review-list cache (the list
 *    that changed), not the reviewee's.
 */
import { assert, assertEquals } from "@std/assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../_shared/logger.ts";
import { cache, CACHE_KEYS } from "../_shared/cache.ts";
import { aggregateStats } from "../_shared/aggregation.ts";
import { submitReview } from "../api-v1-reviews/lib/handlers/submit-review.ts";
import { createMockRequest } from "./test-utils.ts";
import type { HandlerContext } from "../_shared/api-handler.ts";
import type { SubmitReviewBody } from "../api-v1-reviews/lib/schemas.ts";

const REVIEWER = "11111111-1111-4111-8111-111111111111";
const REVIEWEE = "22222222-2222-4222-8222-222222222222";

// ============================================================================
// Recording mock
// ============================================================================

interface RecordedQuery {
  table: string;
  kind: "select" | "insert";
  insertData?: unknown;
  select?: string;
  filters: Record<string, unknown>;
}

type QueryImpl = (
  q: RecordedQuery,
) => { data: unknown; error: { message: string } | null; count: number | null };

function statsMock(impl: QueryImpl) {
  const queries: RecordedQuery[] = [];
  const client = {
    from(table: string) {
      const q: RecordedQuery = { table, kind: "select", filters: {} };
      const builder = {
        select(cols?: string, _opts?: unknown) {
          q.select = cols;
          return builder;
        },
        insert(data: unknown) {
          q.kind = "insert";
          q.insertData = data;
          return builder;
        },
        single() {
          return builder;
        },
        eq(col: string, val: unknown) {
          q.filters[col] = val;
          return builder;
        },
        in(col: string, val: unknown) {
          q.filters[col] = val;
          return builder;
        },
        is(col: string, val: unknown) {
          q.filters[col] = val;
          return builder;
        },
        neq(col: string, val: unknown) {
          q.filters[col] = val;
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        then(
          resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown,
        ) {
          queries.push(q);
          return resolve(impl(q));
        },
      };
      return builder;
    },
    rpc: async () => ({ data: null, error: null }),
  };
  return {
    client: client as unknown as SupabaseClient<any, any, any>,
    queries,
  };
}

function standardImpl(): QueryImpl {
  return (q) => {
    if (q.table === "posts" && q.select && q.select.includes("reviews(")) {
      return {
        data: [
          { reviews: [{ reviewed_rating: 4 }, { reviewed_rating: 5 }] },
          { reviews: [] },
          { reviews: [{ reviewed_rating: null }] },
        ],
        error: null,
        count: null,
      };
    }
    if (q.table === "posts" && q.filters.is_active === true) {
      return { data: [], error: null, count: 4 };
    }
    if (q.table === "posts") {
      return { data: [], error: null, count: 7 };
    }
    if (q.table === "listing_requests") {
      return { data: [], error: null, count: 2 };
    }
    return { data: null, error: { message: "unexpected table " + q.table }, count: null };
  };
}

// ============================================================================
// aggregateStats
// ============================================================================

Deno.test("aggregateStats: profile rating is the mean of reviews RECEIVED on the user's posts", async () => {
  const { client, queries } = statsMock(standardImpl());

  const stats = await aggregateStats(client, REVIEWER);

  // The received-rating query must target the user's posts with a reviews embed,
  // never the flat reviews table.
  const ratingsQuery = queries.find(
    (q) => q.table === "posts" && q.select?.includes("reviews("),
  );
  assert(ratingsQuery, "expected a posts query with a reviews embed");
  assertEquals(ratingsQuery.filters.profile_id, REVIEWER);
  assert(
    !queries.some((q) => q.table === "reviews"),
    "profile rating must not read the flat reviews table (that is the 'given' surface)",
  );

  // 4, 5 from the first post; the second has none; the third's null rating is
  // excluded from both the mean and the count.
  assertEquals(stats.rating, 4.5);
  assertEquals(stats.ratingCount, 2);
  assertEquals(stats.itemsShared, 7);
  assertEquals(stats.itemsReceived, 2);
  assertEquals(stats.activeListings, 4);
});

Deno.test("aggregateStats: reviews the user WROTE never count toward their own rating", async () => {
  // Received: one 5-star. Written (the old source): a 1-star.
  const impl: QueryImpl = (q) => {
    if (q.table === "posts" && q.select && q.select.includes("reviews(")) {
      return { data: [{ reviews: [{ reviewed_rating: 5 }] }], error: null, count: null };
    }
    return standardImpl()(q);
  };
  const { client, queries } = statsMock(impl);

  const stats = await aggregateStats(client, REVIEWER);

  assertEquals(stats.rating, 5, "the given 1-star must not drag the received mean down");
  assertEquals(stats.ratingCount, 1);
  assert(!queries.some((q) => q.table === "reviews"));
});

Deno.test("aggregateStats: no received reviews => null rating, zero count", async () => {
  const impl: QueryImpl = (q) => {
    if (q.table === "posts" && q.select && q.select.includes("reviews(")) {
      return { data: [{ reviews: [] }], error: null, count: null };
    }
    return standardImpl()(q);
  };
  const { client } = statsMock(impl);

  const stats = await aggregateStats(client, REVIEWER);

  assertEquals(stats.rating, null);
  assertEquals(stats.ratingCount, 0);
});

Deno.test("aggregateStats: a failed listing_requests count is logged, not swallowed", async () => {
  const impl: QueryImpl = (q) => {
    if (q.table === "listing_requests") {
      // The table does not exist in any migration — this is the real shape.
      return {
        data: null,
        error: { message: "PGRST205: Could not find the table" },
        count: null,
      };
    }
    return standardImpl()(q);
  };
  const { client } = statsMock(impl);

  const warnings: Record<string, unknown>[] = [];
  const originalWarn = logger.warn;
  logger.warn = (message: string, data?: Record<string, unknown>) => {
    warnings.push({ message, ...data });
  };
  try {
    const stats = await aggregateStats(client, REVIEWER);
    assertEquals(stats.itemsReceived, 0, "a failed count is a zero, but...");
    const entry = warnings.find(
      (w) => String(w.relation ?? w.message).includes("listing_requests"),
    );
    assert(entry, "the fallback failure must reach the logs");
  } finally {
    logger.warn = originalWarn;
  }
});

Deno.test("aggregateStats: a failed received-rating query is logged, rating null", async () => {
  const impl: QueryImpl = (q) => {
    if (q.table === "posts" && q.select && q.select.includes("reviews(")) {
      return {
        data: null,
        error: { message: "PGRST205: could not resolve embed" },
        count: null,
      };
    }
    return standardImpl()(q);
  };
  const { client } = statsMock(impl);

  const warnings: Record<string, unknown>[] = [];
  const originalWarn = logger.warn;
  logger.warn = (message: string, data?: Record<string, unknown>) => {
    warnings.push({ message, ...data });
  };
  try {
    const stats = await aggregateStats(client, REVIEWER);
    assertEquals(stats.rating, null);
    assertEquals(stats.ratingCount, 0);
    assert(warnings.length > 0, "the failed rating query must be logged");
  } finally {
    logger.warn = originalWarn;
  }
});

// ============================================================================
// submitReview cache invalidation
// ============================================================================

function reviewCtx(client: SupabaseClient<any, any, any>, reviewerId: string) {
  const request = createMockRequest({
    method: "POST",
    path: "/functions/v1/api-v1-reviews",
  });
  return {
    request,
    userId: reviewerId,
    supabase: client,
    body: {
      revieweeId: REVIEWEE,
      postId: 7,
      rating: 5,
      feedback: "Great pickup",
    },
    query: {},
    corsHeaders: {},
  } as unknown as HandlerContext<SubmitReviewBody>;
}

Deno.test("submitReview: invalidates the REVIEWER's review list (the list that changed)", async () => {
  const impl: QueryImpl = (q) => {
    // Duplicate check: no existing review.
    if (q.table === "reviews" && q.kind === "select") {
      return {
        data: null,
        error: { message: "PGRST116: no rows" },
        count: 0,
      };
    }
    // Insert: the new review row.
    if (q.table === "reviews" && q.kind === "insert") {
      return {
        data: {
          id: 99,
          profile_id: REVIEWER,
          post_id: 7,
          reviewed_rating: 5,
          feedback: "Great pickup",
          created_at: "2026-11-08T00:00:00Z",
        },
        error: null,
        count: null,
      };
    }
    return { data: null, error: { message: "unexpected " + q.select }, count: null };
  };
  const { client } = statsMock(impl);

  const sentinel = { items: [], total: 0 };
  cache.set(CACHE_KEYS.reviews(REVIEWER, 20), sentinel, 60_000);
  cache.set(CACHE_KEYS.reviews(REVIEWEE, 20), sentinel, 60_000);

  try {
    await submitReview(reviewCtx(client, REVIEWER));

    assertEquals(
      cache.get(CACHE_KEYS.reviews(REVIEWER, 20)),
      null,
      "the reviewer's 'reviews I wrote' list gained a row — its cache must be dropped",
    );
    assertEquals(
      cache.get(CACHE_KEYS.reviews(REVIEWEE, 20)),
      sentinel,
      "the reviewee's 'reviews I wrote' list did not change — its cache must be untouched",
    );
  } finally {
    cache.delete(CACHE_KEYS.reviews(REVIEWER, 20));
    cache.delete(CACHE_KEYS.reviews(REVIEWEE, 20));
  }
});
