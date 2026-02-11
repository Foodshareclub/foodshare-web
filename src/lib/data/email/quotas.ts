/**
 * Email Provider Quota Management
 * Per-provider daily + monthly quota tracking
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { EmailProvider } from "@/lib/email/types";

// ============================================================================
// Types
// ============================================================================

export interface ProviderQuotaDetails {
  provider: EmailProvider;
  daily: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  monthly: {
    sent: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  isAvailable: boolean;
}

// ============================================================================
// Quota Functions
// ============================================================================

/**
 * Get comprehensive quota status for all providers
 * Uses admin client to bypass RLS (admin-only data)
 */
export async function getComprehensiveQuotaStatus(): Promise<ProviderQuotaDetails[]> {
  const supabase = createAdminClient();

  // Read from email_provider_health_metrics (synced from provider APIs)
  const { data, error } = await supabase
    .from("email_provider_health_metrics")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error || !data || data.length === 0) {
    if (error) console.error("Failed to fetch quota data:", error.message);
    return getDefaultQuotaDetails();
  }

  const providers: EmailProvider[] = ["resend", "brevo", "mailersend", "aws_ses"];
  const defaults = getDefaultQuotaDetails();

  return providers.map((provider) => {
    const healthRow = data.find((h) => h.provider === provider);
    const defaultQuota = defaults.find((d) => d.provider === provider)!;

    // Daily quota from health metrics (synced from provider APIs)
    const dailySent = healthRow?.daily_quota_used || 0;
    const dailyLimit = healthRow?.daily_quota_limit || defaultQuota.daily.limit;
    const dailyRemaining = Math.max(0, dailyLimit - dailySent);
    const dailyPercentUsed = dailyLimit > 0 ? (dailySent / dailyLimit) * 100 : 0;

    // Monthly quota from health metrics
    const monthlySent = healthRow?.monthly_quota_used || 0;
    const monthlyLimit = healthRow?.monthly_quota_limit || defaultQuota.monthly.limit;
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlySent);
    const monthlyPercentUsed = monthlyLimit > 0 ? (monthlySent / monthlyLimit) * 100 : 0;

    return {
      provider,
      daily: {
        sent: dailySent,
        limit: dailyLimit,
        remaining: dailyRemaining,
        percentUsed: Math.round(dailyPercentUsed * 10) / 10,
      },
      monthly: {
        sent: monthlySent,
        limit: monthlyLimit,
        remaining: monthlyRemaining,
        percentUsed: Math.round(monthlyPercentUsed * 10) / 10,
      },
      isAvailable: dailyPercentUsed < 95 && monthlyPercentUsed < 95,
    };
  });
}

export function getDefaultQuotaDetails(): ProviderQuotaDetails[] {
  const defaults: Array<{ provider: EmailProvider; dailyLimit: number; monthlyLimit: number }> = [
    { provider: "resend", dailyLimit: 100, monthlyLimit: 3000 },
    { provider: "brevo", dailyLimit: 300, monthlyLimit: 9000 },
    { provider: "mailersend", dailyLimit: 400, monthlyLimit: 12000 },
    { provider: "aws_ses", dailyLimit: 100, monthlyLimit: 62000 },
  ];

  return defaults.map((d) => ({
    provider: d.provider,
    daily: { sent: 0, limit: d.dailyLimit, remaining: d.dailyLimit, percentUsed: 0 },
    monthly: { sent: 0, limit: d.monthlyLimit, remaining: d.monthlyLimit, percentUsed: 0 },
    isAvailable: true,
  }));
}
