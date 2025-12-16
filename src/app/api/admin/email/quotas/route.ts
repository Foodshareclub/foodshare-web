/**
 * API Route: Provider Quotas
 * GET /api/admin/email/quotas
 * Returns current quota status for all email providers
 */

import { NextResponse } from "next/server";
import { getComprehensiveQuotaStatus } from "@/lib/data/admin-email";

export async function GET() {
  try {
    const quotaData = await getComprehensiveQuotaStatus();

    // Transform to match ProviderQuotaStatus interface expected by frontend
    const quotas = quotaData.map((quota) => ({
      provider: quota.provider,
      status:
        quota.daily.percentUsed >= 90
          ? "exhausted"
          : quota.daily.percentUsed >= 70
            ? "warning"
            : "ok",
      usage_percentage: quota.daily.percentUsed,
      emails_sent: quota.daily.sent,
      remaining: quota.daily.remaining,
      daily_limit: quota.daily.limit,
    }));

    return NextResponse.json(quotas);
  } catch (error) {
    console.error("[API /api/admin/email/quotas] Error:", error);
    return NextResponse.json({ error: "Failed to fetch quota data" }, { status: 500 });
  }
}
