/**
 * API Route: Bounce Statistics
 * GET /api/admin/email/bounces
 * Returns email bounce statistics
 */

import { NextResponse } from "next/server";
import { getBounceStats } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const bounceStats = await getBounceStats();
    return NextResponse.json(bounceStats);
  } catch (error) {
    console.error("[API /api/admin/email/bounces] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bounce statistics" },
      { status: 500 }
    );
  }
}
