/**
 * API Route: Sync Email Provider Stats
 * POST /api/admin/email/sync
 * Triggers the sync-email-provider-stats Edge Function to fetch real data from providers
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserIsAdmin } from "@/lib/data/admin-check";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check admin auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isAdmin } = await checkUserIsAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get provider from body if specified
    const body = await request.json().catch(() => ({}));
    const provider = body.provider;

    // Call the Edge Function
    const endpoint = provider
      ? `sync-email-provider-stats/sync/${provider}`
      : "sync-email-provider-stats/sync";

    const { data, error } = await supabase.functions.invoke(endpoint, {
      method: "POST",
    });

    if (error) {
      console.error("[API /api/admin/email/sync] Edge function error:", error);
      return NextResponse.json(
        { error: "Failed to sync provider stats", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API /api/admin/email/sync] Error:", error);
    return NextResponse.json({ error: "Failed to sync provider stats" }, { status: 500 });
  }
}
