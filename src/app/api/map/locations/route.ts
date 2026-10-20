import { getNearbyLocations } from "@/lib/data/maps";
import type { LocationType } from "@/types/product.types";
import { urlToDbType } from "@/utils/categoryMapping";
import { NextResponse } from "next/server";

/**
 * Viewport marker fetch for the map.
 *
 * This was a Server Action (`POST /app/actions/map.ts`), which meant every
 * `moveend` on the map consumed one of the **30/minute** mutation-limiter
 * budget in `src/proxy.ts` — a limiter with no path filter, so it applied to
 * reads too. Panning the map for ~10 seconds returned 429, after which marker
 * loading stopped. It is a read; a read should be a GET.
 *
 * Consequence of being a GET: it is covered by the global limiter
 * (100 req/10s per IP) rather than the 30/min mutation limiter, and it is
 * cacheable by the CDN and by the browser's HTTP cache.
 *
 * Public by design — the same data is already served anonymously via PostgREST
 * with the browser's anon key. `getNearbyLocations` applies the ~200m location
 * fuzz before returning, so exact sharer coordinates never leave the server.
 *
 * No `export const dynamic` here: `cacheComponents` is enabled and the build
 * rejects that segment config. Reading `request.url` already opts the route out
 * of prerendering.
 */

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Hard ceiling on markers per response. */
const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 500;

function parseBounds(params: URLSearchParams): Bounds | null {
  const raw = {
    north: params.get("north"),
    south: params.get("south"),
    east: params.get("east"),
    west: params.get("west"),
  };

  const parsed: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null) return null;
    const num = Number(value);
    // Reject NaN, Infinity and non-numeric input; a non-finite bound would
    // produce an unbounded PostGIS envelope.
    if (!Number.isFinite(num)) return null;
    parsed[key] = num;
  }

  if (parsed.north < parsed.south || parsed.east < parsed.west) return null;
  if (Math.abs(parsed.north) > 90 || Math.abs(parsed.south) > 90) return null;
  if (Math.abs(parsed.east) > 180 || Math.abs(parsed.west) > 180) return null;

  return parsed as unknown as Bounds;
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const bounds = parseBounds(searchParams);
  if (!bounds) {
    return NextResponse.json({ error: "Invalid or missing bounds (north, south, east, west)" }, { status: 400 });
  }

  // URL slugs are pluralised ("/map/things"), the column is singular.
  const urlType = searchParams.get("type");
  const productType = urlType ? urlToDbType(urlType) : undefined;

  const requested = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(requested) && requested > 0 ? Math.min(Math.floor(requested), MAX_LIMIT) : DEFAULT_LIMIT;

  try {
    const locations: LocationType[] = await getNearbyLocations(bounds, productType, limit);
    return NextResponse.json(
      { locations },
      { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=45" } },
    );
  } catch (error) {
    // Log and return an error rather than an empty list. The client treats an
    // error as "keep the markers we already have" — returning `[]` here would
    // blank the map on any transient failure.
    console.error("[api/map/locations] Failed to load locations:", error);
    return NextResponse.json({ error: "Failed to load locations" }, { status: 502 });
  }
}
