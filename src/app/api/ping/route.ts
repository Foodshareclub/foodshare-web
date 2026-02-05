/**
 * Lightweight Health Check for External Monitoring
 *
 * This endpoint is optimized for minimal function invocations:
 * - No database queries
 * - No auth checks
 * - Cached response
 * - Edge runtime
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: Date.now() },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
