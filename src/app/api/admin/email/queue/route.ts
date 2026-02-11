/**
 * API Route: Email Queue
 * GET /api/admin/email/queue
 * Returns queued emails with optional status filtering
 */

import { NextResponse } from "next/server";
import { getQueuedEmails } from "@/lib/data/admin-email";
import { requireAdmin } from "../_shared/requireAdmin";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { searchParams } = new URL(request.url);

    const params = {
      status: searchParams.get("status") || undefined,
    };

    const queuedEmails = await getQueuedEmails(params);

    return NextResponse.json(queuedEmails);
  } catch (error) {
    console.error("[API /api/admin/email/queue] Error:", error);
    return NextResponse.json({ error: "Failed to fetch queued emails" }, { status: 500 });
  }
}
