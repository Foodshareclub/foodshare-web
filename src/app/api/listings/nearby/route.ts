import { decodeNearbyCursor, encodeNearbyCursor } from "@/lib/api/listing-cursor";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { NextResponse } from "next/server";

/**
 * Location-scoped listing feed.
 *
 * Was `fetchNearbyListings`, a Server Action. Same defect as
 * `app/api/listings/route.ts`: a read billed against the 30/minute mutation
 * limiter, so infinite scroll with a detected location exhausted the same
 * budget that real writes share.
 *
 * Radius clamping stays here, server-side. The client also clamps, and it
 * used to be free to disagree: a client that asked for 500 km got 50 km back
 * and the response told it what actually happened. That contract is
 * preserved — `radius` in the response is the radius used.
 *
 * `private` rather than `public` caching: the result is scoped to a
 * coordinate pair supplied in the URL, and while the coordinates do not
 * identify a person on their own, there is no benefit to sharing them
 * through a shared cache.
 */

/** Clamp bounds for the radius the client is allowed to request. */
const MIN_RADIUS_METERS = 100; // 100m
const MAX_RADIUS_METERS = 50000; // 50km hard cap (matches HomeClient MAX_RADIUS)

const LIMIT = 20;

/**
 * Coordinates are user input and go straight into a PostGIS envelope, so they
 * are validated here rather than trusted. A non-finite or out-of-range value
 * would produce an unbounded `ST_DWithin` call.
 */
function parseCoordinate(raw: string | null): number | null {
  if (raw === null || raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const lat = parseCoordinate(searchParams.get("lat"));
  const lng = parseCoordinate(searchParams.get("lng"));

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Invalid coordinates (lat, lng)" }, { status: 400 });
  }

  const requestedRadius = Number(searchParams.get("radius"));
  const radius = Number.isFinite(requestedRadius)
    ? Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, requestedRadius))
    : 5000;

  const postType = searchParams.get("type") ?? "food";
  const searchTerm = searchParams.get("q") ?? undefined;
  const cursor = decodeNearbyCursor(searchParams.get("cursor"));

  try {
    const result = await getNearbyPosts({
      lat,
      lng,
      radiusMeters: radius,
      postType,
      limit: LIMIT,
      cursor,
      searchTerm,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        hasMore: result.hasMore,
        // Encoded so the client can hand it straight back. The previous
        // Server Action returned the object and relied on the framework's
        // serialisation; a URL has no such luxury.
        nextCursor: encodeNearbyCursor(result.nextCursor),
        radius,
      },
      { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } },
    );
  } catch (error) {
    console.error("[api/listings/nearby] Failed to load nearby listings:", error);
    return NextResponse.json({ success: false, error: "Failed to load nearby listings" }, { status: 502 });
  }
}
