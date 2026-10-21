/**
 * Products API Route
 * Client-safe endpoint for fetching products
 * Uses standardized ApiResponse type for consistent error/success patterns
 */

import type { ApiResponse } from "@/lib/api-types";
import type { InitialProductStateType } from "@/lib/data/products";
import { getProducts } from "@/lib/data/products";
import { NextResponse } from "next/server";

/** Matches the payload the feed has always asked for. */
const DEFAULT_LIMIT = 12;
/** A page size is a client hint, not an instruction — without a bound one
 *  request can ask the cached read for the whole table. */
const MAX_LIMIT = 50;

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
}

/**
 * GET /api/products
 *
 * This handler reads the request **on purpose**, and the reason is the build.
 * Under `cacheComponents` `export const dynamic` is rejected outright, so
 * reading `request.url` is the switch that opts a route out of prerendering —
 * the same one `api/listings` and `api/map/locations` already use, for the
 * same reason.
 *
 * Without it the handler is fully static: Next evaluates it once during the
 * build, which makes `bun run build` depend on the database (the
 * `unknown certificate verification error` it failed with) and, worse, freezes
 * that one response as the answer for every later request.
 *
 * `type` is read rather than hardcoded because the previous constant,
 * `"latest"`, is not a `post_type` at all — the query matched no rows, so this
 * endpoint answered `data: []` for everyone who called it.
 */
export async function GET(request: Request): Promise<NextResponse<ApiResponse<InitialProductStateType[]>>> {
  const { searchParams } = new URL(request.url);
  const productType = searchParams.get("type") ?? "food";

  const products = await getProducts(productType, { limit: parseLimit(searchParams.get("limit")) });

  if (!products) {
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: products }, { status: 200 });
}
