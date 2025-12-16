/**
 * API Route: Audience Segments
 * GET /api/admin/email/segments
 * Returns audience segments
 */

import { NextResponse } from "next/server";
import { getAudienceSegments } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const segments = await getAudienceSegments();
    return NextResponse.json(segments);
  } catch (error) {
    console.error("[API /api/admin/email/segments] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch segments" },
      { status: 500 }
    );
  }
}
