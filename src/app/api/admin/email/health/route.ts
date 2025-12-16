/**
 * API Route: Provider Health
 * GET /api/admin/email/health
 * Returns health metrics for all email providers
 */

import { NextResponse } from "next/server";
import { getProviderHealth } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const health = await getProviderHealth();
    return NextResponse.json(health);
  } catch (error) {
    console.error("[API /api/admin/email/health] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider health" },
      { status: 500 }
    );
  }
}
