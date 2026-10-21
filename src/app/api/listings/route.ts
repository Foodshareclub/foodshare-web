import { getProductsPaginated } from "@/lib/data/products";
import { NextResponse } from "next/server";

/**
 * Paginated listing feed for infinite scroll on the home page.
 *
 * This was a Server Action (`fetchProductsPaginated` in
 * `app/actions/nearby-listings.ts`). A read behind a POST spends one of the
 * **30/minute** mutation-limiter calls in `proxy.ts` — a limiter that has no
 * path filter, so it counted reads as writes. Scrolling the feed a few times
 * returned 429, `HomeClient` set `paginationFailed`, and the user saw
 * "Something went wrong" instead of the next page. Worse, the exhausted
 * bucket is shared with real writes, so the next "Hide post" or "Send
 * message" was rate limited by scrolling.
 *
 * Same reasoning as `app/api/map/locations/route.ts`, which was moved off
 * Server Actions for the identical reason. As a GET it is covered by the
 * global 100 req/10 s limiter instead, and is cacheable by the browser and
 * the CDN.
 *
 * No `export const dynamic`: `cacheComponents` is enabled and the build
 * rejects that segment config. Reading `request.url` already opts the route
 * out of prerendering.
 */

/** Page size, matching the client's request. */
const LIMIT = 20;

/**
 * `cursor` is an id for keyset pagination, so it must be a positive integer.
 * `Number("abc")` is NaN, and passing NaN into a `.lt()` filter is a query
 * that returns nothing while looking like a valid request.
 */
function parseCursor(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const productType = searchParams.get("type") ?? "food";
  const searchTerm = searchParams.get("q") ?? undefined;
  const cursor = parseCursor(searchParams.get("cursor"));

  try {
    const result = await getProductsPaginated(productType, { limit: LIMIT, cursor, searchTerm });

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    // The client treats a failure as "keep the products we already have".
    // Returning `success: false` rather than an empty page is what makes
    // that possible: an empty `data` array would blank the feed.
    console.error("[api/listings] Failed to load listings:", error);
    return NextResponse.json({ success: false, error: "Failed to load listings" }, { status: 502 });
  }
}
