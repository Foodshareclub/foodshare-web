/**
 * API Route: Provider Quotas
 * GET /api/admin/email/quotas
 * Returns current quota status for all email providers
 */

import { NextResponse } from "next/server";
import { getComprehensiveQuotaStatus } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const quotaData = await getComprehensiveQuotaStatus();
    return NextResponse.json(quotaData);
  } catch (error) {
    console.error("[API /api/admin/email/quotas] Error:", error);
    return NextResponse.json({ error: "Failed to fetch quota data" }, { status: 500 });
  }
}
