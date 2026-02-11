/**
 * API Route: Audience Segments
 * GET /api/admin/email/segments
 * Returns audience segments
 */

import { NextResponse } from "next/server";
import { getAudienceSegments } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

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
