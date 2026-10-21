/**
 * API Route: Provider Health
 * GET /api/admin/email/health
 * Returns health metrics for all email providers
 */

import { getProviderHealth } from "@/lib/data/admin-email";
import { isPrerenderInterruption } from "@/lib/errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const health = await getProviderHealth();
    return NextResponse.json(health);
  } catch (error) {
    if (isPrerenderInterruption(error)) {
      throw error;
    }
    console.error("[API /api/admin/email/health] Error:", error);
    return NextResponse.json({ error: "Failed to fetch provider health" }, { status: 500 });
  }
}
