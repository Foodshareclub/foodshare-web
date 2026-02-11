/**
 * API Route: Email Logs
 * GET /api/admin/email/logs
 * Returns email delivery logs with optional filtering
 */

import { NextResponse } from "next/server";
import { getEmailLogs } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";
import type { EmailProvider, EmailType } from "@/lib/email/types";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);

    const params = {
      provider: searchParams.get("provider") as EmailProvider | undefined,
      emailType: searchParams.get("emailType") as EmailType | undefined,
      status: searchParams.get("status") || undefined,
      hours: searchParams.get("hours") ? parseInt(searchParams.get("hours")!) : 24,
    };

    const logs = await getEmailLogs(params);

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API /api/admin/email/logs] Error:", error);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
