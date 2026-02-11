/**
 * API Route: Email Templates
 * GET /api/admin/email/templates
 * Returns email templates
 */

import { NextResponse } from "next/server";
import { getEmailTemplates } from "@/lib/data/automations";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const templates = await getEmailTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json([], { status: 500 });
  }
}
