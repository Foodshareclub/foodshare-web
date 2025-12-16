/**
 * API Route: Email Dashboard Statistics
 * GET /api/admin/email/stats
 * Returns email dashboard statistics (subscribers, quotas, rates)
 */

import { NextResponse } from "next/server";
import { getEmailDashboardStats } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const stats = await getEmailDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API /api/admin/email/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch email statistics" }, { status: 500 });
  }
}
