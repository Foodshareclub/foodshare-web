/**
 * API Route: Recent Campaigns
 * GET /api/admin/email/campaigns
 * Returns recent email campaigns
 */

import { getRecentCampaigns } from "@/lib/data/admin-email";
import { isPrerenderInterruption } from "@/lib/errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const campaigns = await getRecentCampaigns();
    return NextResponse.json(campaigns);
  } catch (error) {
    if (isPrerenderInterruption(error)) {
      throw error;
    }
    console.error("[API /api/admin/email/campaigns] Error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
