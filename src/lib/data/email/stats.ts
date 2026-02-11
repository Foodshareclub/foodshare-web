/**
 * Email Dashboard Statistics & Combined CRM Data
 * Aggregated stats and the combined getEmailCRMData() orchestrator
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderQuotaDetails } from "./quotas";
import { getComprehensiveQuotaStatus } from "./quotas";
import type { BounceStats, ProviderHealth, CircuitBreakerState, EmailTemplate } from "./health";
import { getBounceStats, getProviderHealth, getCircuitBreakerStates, getEmailTemplates } from "./health";
import type { RecentCampaign, ActiveAutomation, AudienceSegment, QueueStats } from "./queue";
import { getRecentCampaigns, getActiveAutomations, getAudienceSegments, getQueueStats } from "./queue";

// ============================================================================
// Types
// ============================================================================

export interface EmailDashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  emailsSent30d: number;
  avgOpenRate: number;
  avgClickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  activeCampaigns: number;
  activeAutomations: number;
  // Daily quota (combined)
  dailyQuotaUsed: number;
  dailyQuotaLimit: number;
  // Monthly quota (combined)
  monthlyQuotaUsed: number;
  monthlyQuotaLimit: number;
  // Suppression stats
  suppressedEmails: number;
}

export interface EmailCRMData {
  stats?: EmailDashboardStats | undefined;
  providerHealth?: ProviderHealth[] | undefined;
  campaigns?: RecentCampaign[] | undefined;
  automations?: ActiveAutomation[] | undefined;
  segments?: AudienceSegment[] | undefined;
  quotaDetails?: ProviderQuotaDetails[] | undefined;
  bounceStats?: BounceStats | undefined;
  templates?: EmailTemplate[] | undefined;
  circuitBreakers?: CircuitBreakerState[] | undefined;
  queueStats?: QueueStats | undefined;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

/**
 * Get email dashboard stats
 * Uses admin client to bypass RLS and aggregate from provider health metrics
 */
export async function getEmailDashboardStats(): Promise<EmailDashboardStats> {
  const supabase = createAdminClient();

  // Parallel fetch all data
  const [
    // Provider health metrics for quota aggregation
    providerMetricsRes,
    // Subscriber counts
    subscribersRes,
    activeSubsRes,
    registeredUsersRes,
    // Automation count
    automationsRes,
    // Campaign count
    campaignsRes,
    // Suppression list count
    suppressionRes,
  ] = await Promise.all([
    // Get all provider health metrics to aggregate quotas
    supabase.from("email_provider_health_metrics").select("*"),
    // Total newsletter subscribers
    supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
    // Active newsletter subscribers
    supabase
      .from("newsletter_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Registered users with email preferences
    supabase.from("email_preferences").select("*", { count: "exact", head: true }),
    // Active automations
    supabase
      .from("email_automation_flows")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    // Active campaigns
    supabase
      .from("email_campaigns")
      .select("*", { count: "exact", head: true })
      .in("status", ["draft", "scheduled", "sending"]),
    // Suppression list count
    supabase.from("email_suppression_list").select("*", { count: "exact", head: true }),
  ]);

  // Aggregate quota from all providers
  const providers = providerMetricsRes.data || [];
  const dailyQuotaUsed = providers.reduce((sum, p) => sum + (p.daily_quota_used || 0), 0);
  const dailyQuotaLimit = providers.reduce((sum, p) => sum + (p.daily_quota_limit || 0), 0);
  const monthlyQuotaUsed = providers.reduce((sum, p) => sum + (p.monthly_quota_used || 0), 0);
  const monthlyQuotaLimit = providers.reduce((sum, p) => sum + (p.monthly_quota_limit || 0), 0);
  const totalRequests = providers.reduce((sum, p) => sum + (p.total_requests || 0), 0);
  const successfulRequests = providers.reduce((sum, p) => sum + (p.successful_requests || 0), 0);

  // Calculate rates
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
  const bounceRate = totalRequests > 0 ? 100 - successRate : 0;

  // Combine subscriber counts
  const totalSubs = (subscribersRes.count || 0) + (registeredUsersRes.count || 0);
  const activeSubs = (activeSubsRes.count || 0) + (registeredUsersRes.count || 0);

  return {
    totalSubscribers: totalSubs,
    activeSubscribers: activeSubs,
    emailsSent30d: dailyQuotaUsed, // Use daily quota as proxy for recent sends
    avgOpenRate: 24.5, // TODO: Calculate from email_events when available
    avgClickRate: 3.2, // TODO: Calculate from email_events when available
    unsubscribeRate: 0.3, // TODO: Calculate from unsubscribe events
    bounceRate: Math.round(bounceRate * 10) / 10,
    activeCampaigns: campaignsRes.count || 0,
    activeAutomations: automationsRes.count || 0,
    dailyQuotaUsed,
    dailyQuotaLimit: dailyQuotaLimit || 500,
    monthlyQuotaUsed,
    monthlyQuotaLimit: monthlyQuotaLimit || 15000,
    suppressedEmails: suppressionRes.count || 0,
  };
}

// ============================================================================
// Combined Dashboard Data
// ============================================================================

export async function getEmailCRMData(): Promise<EmailCRMData> {
  const [
    stats,
    providerHealth,
    campaigns,
    automations,
    segments,
    quotaDetails,
    bounceStats,
    templates,
    circuitBreakers,
    queueStats,
  ] = await Promise.all([
    getEmailDashboardStats(),
    getProviderHealth(),
    getRecentCampaigns(),
    getActiveAutomations(),
    getAudienceSegments(),
    getComprehensiveQuotaStatus(),
    getBounceStats(),
    getEmailTemplates(),
    getCircuitBreakerStates(),
    getQueueStats(),
  ]);

  return {
    stats,
    providerHealth,
    campaigns,
    automations,
    segments,
    quotaDetails,
    bounceStats,
    templates,
    circuitBreakers,
    queueStats,
  };
}
