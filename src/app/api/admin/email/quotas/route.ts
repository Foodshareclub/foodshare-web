/**
 * API Route: Provider Quotas
 * GET /api/admin/email/quotas
 * Returns current quota status for all email providers
 */

import { NextResponse } from "next/server";
import { getComprehensiveQuotaStatus } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const quotaData = await getComprehensiveQuotaStatus();
    return NextResponse.json(quotaData);
  } catch (error) {
    console.error("[API /api/admin/email/quotas] Error:", error);
    return NextResponse.json({ error: "Failed to fetch quota data" }, { status: 500 });
  }
}
