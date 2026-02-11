/**
 * API Route: Active Automations
 * GET /api/admin/email/automations
 * Returns active email automation flows
 */

import { NextResponse } from "next/server";
import { getActiveAutomations } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const automations = await getActiveAutomations();
    return NextResponse.json(automations);
  } catch (error) {
    console.error("[API /api/admin/email/automations] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}
