/**
 * API Route: Email Statistics
 * GET /api/admin/email/stats
 * Returns email statistics for the last 24 hours
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get total sent and failed in last 24h
    const { data: sentData } = await supabase
      .from("email_logs")
      .select("provider, status")
      .gte("created_at", since24h);

    // Get queued emails count
    const { data: queueData } = await supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true });

    const totalSent = sentData?.length || 0;
    const totalFailed = sentData?.filter((e) => e.status === "failed").length || 0;
    const totalQueued = (queueData as unknown as { count: number })?.count || 0;
    const successRate = totalSent > 0 ? ((totalSent - totalFailed) / totalSent) * 100 : 0;

    // Group by provider
    const providerMap = new Map<string, { sent: number; failed: number }>();
    sentData?.forEach((email) => {
      const provider = email.provider;
      const current = providerMap.get(provider) || { sent: 0, failed: 0 };
      current.sent++;
      if (email.status === "failed") current.failed++;
      providerMap.set(provider, current);
    });

    const providerStats = Array.from(providerMap.entries()).map(([provider, stats]) => ({
      provider,
      sent: stats.sent,
      failed: stats.failed,
      successRate: stats.sent > 0 ? ((stats.sent - stats.failed) / stats.sent) * 100 : 0,
    }));

    const stats = {
      totalSent24h: totalSent,
      totalFailed24h: totalFailed,
      totalQueued,
      successRate,
      providerStats,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API /api/admin/email/stats] Error:", error);
    return NextResponse.json({ error: "Failed to fetch email statistics" }, { status: 500 });
  }
}
