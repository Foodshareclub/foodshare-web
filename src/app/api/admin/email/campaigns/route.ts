/**
 * API Route: Recent Campaigns
 * GET /api/admin/email/campaigns
 * Returns recent email campaigns
 */

import { NextResponse } from "next/server";
import { getRecentCampaigns } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const campaigns = await getRecentCampaigns();
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("[API /api/admin/email/campaigns] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
