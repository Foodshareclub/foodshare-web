/**
 * API Route: Email Logs
 * GET /api/admin/email/logs
 * Returns email delivery logs with optional filtering
 */

import { getEmailLogs } from "@/lib/data/admin-email";
import type { EmailProvider, EmailType } from "@/lib/email/types";
import { isPrerenderInterruption } from "@/lib/errors";
import { NextResponse } from "next/server";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);

    const params = {
      provider: searchParams.get("provider") as EmailProvider | undefined,
      emailType: searchParams.get("emailType") as EmailType | undefined,
      status: searchParams.get("status") || undefined,
      hours: Number.parseInt(searchParams.get("hours") || "24", 10),
    };

    const logs = await getEmailLogs(params);

    return NextResponse.json(logs);
  } catch (error) {
    if (isPrerenderInterruption(error)) {
      throw error;
    }
    console.error("[API /api/admin/email/logs] Error:", error);
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 });
  }
}
