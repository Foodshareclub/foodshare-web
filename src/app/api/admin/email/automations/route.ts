/**
 * API Route: Active Automations
 * GET /api/admin/email/automations
 * Returns active email automation flows
 */

import { NextResponse } from "next/server";
import { getActiveAutomations } from "@/lib/data/admin-email";

export async function GET() {
  try {
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
