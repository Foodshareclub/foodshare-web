/**
 * React Query hooks for Email CRM data
 * Fetches data dynamically from API endpoints
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  EmailDashboardStats,
  ProviderHealth,
  RecentCampaign,
  ActiveAutomation,
  AudienceSegment,
  ProviderQuotaDetails,
  BounceStats,
} from "@/lib/data/admin-email";
import type { EmailTemplate } from "@/types/automations.types";

// Query keys
export const emailCRMKeys = {
  all: ["email-crm"] as const,
  stats: () => [...emailCRMKeys.all, "stats"] as const,
  health: () => [...emailCRMKeys.all, "health"] as const,
  campaigns: () => [...emailCRMKeys.all, "campaigns"] as const,
  automations: () => [...emailCRMKeys.all, "automations"] as const,
  segments: () => [...emailCRMKeys.all, "segments"] as const,
  quotas: () => [...emailCRMKeys.all, "quotas"] as const,
  bounces: () => [...emailCRMKeys.all, "bounces"] as const,
  templates: () => [...emailCRMKeys.all, "templates"] as const,
};

// Fetch functions
async function fetchStats(): Promise<EmailDashboardStats> {
  const res = await fetch("/api/admin/email/stats");
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

async function fetchHealth(): Promise<ProviderHealth[]> {
  const res = await fetch("/api/admin/email/health");
  if (!res.ok) throw new Error("Failed to fetch provider health");
  return res.json();
}

async function fetchCampaigns(): Promise<RecentCampaign[]> {
  const res = await fetch("/api/admin/email/campaigns");
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  return res.json();
}

async function fetchAutomations(): Promise<ActiveAutomation[]> {
  const res = await fetch("/api/admin/email/automations");
  if (!res.ok) throw new Error("Failed to fetch automations");
  return res.json();
}

async function fetchSegments(): Promise<AudienceSegment[]> {
  const res = await fetch("/api/admin/email/segments");
  if (!res.ok) throw new Error("Failed to fetch segments");
  return res.json();
}

async function fetchQuotas(): Promise<ProviderQuotaDetails[]> {
  const res = await fetch("/api/admin/email/quotas");
  if (!res.ok) throw new Error("Failed to fetch quotas");
  return res.json();
}

async function fetchBounces(): Promise<BounceStats> {
  const res = await fetch("/api/admin/email/bounces");
  if (!res.ok) throw new Error("Failed to fetch bounce stats");
  return res.json();
}

async function fetchTemplates(): Promise<EmailTemplate[]> {
  const res = await fetch("/api/admin/email/templates");
  if (!res.ok) throw new Error("Failed to fetch email templates");
  return res.json();
}

// Individual hooks
export function useEmailStats() {
  return useQuery({
    queryKey: emailCRMKeys.stats(),
    queryFn: fetchStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider fresh for 20 seconds
  });
}

export function useProviderHealth() {
  return useQuery({
    queryKey: emailCRMKeys.health(),
    queryFn: fetchHealth,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 45000,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: emailCRMKeys.campaigns(),
    queryFn: fetchCampaigns,
    refetchInterval: 60000,
    staleTime: 45000,
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: emailCRMKeys.automations(),
    queryFn: fetchAutomations,
    refetchInterval: 60000,
    staleTime: 45000,
  });
}

export function useSegments() {
  return useQuery({
    queryKey: emailCRMKeys.segments(),
    queryFn: fetchSegments,
    refetchInterval: 120000, // Refresh every 2 minutes
    staleTime: 90000,
  });
}

export function useQuotas() {
  return useQuery({
    queryKey: emailCRMKeys.quotas(),
    queryFn: fetchQuotas,
    refetchInterval: 30000, // Refresh every 30 seconds (quota changes frequently)
    staleTime: 20000,
  });
}

export function useBounceStats() {
  return useQuery({
    queryKey: emailCRMKeys.bounces(),
    queryFn: fetchBounces,
    refetchInterval: 60000,
    staleTime: 45000,
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: emailCRMKeys.templates(),
    queryFn: fetchTemplates,
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000,
  });
}

// Combined hook for all CRM data
export function useEmailCRMData() {
  const stats = useEmailStats();
  const health = useProviderHealth();
  const campaigns = useCampaigns();
  const automations = useAutomations();
  const segments = useSegments();
  const quotas = useQuotas();
  const bounces = useBounceStats();

  return {
    stats: stats.data,
    providerHealth: health.data,
    campaigns: campaigns.data,
    automations: automations.data,
    segments: segments.data,
    quotaDetails: quotas.data,
    bounceStats: bounces.data,
    isLoading:
      stats.isLoading ||
      health.isLoading ||
      campaigns.isLoading ||
      automations.isLoading ||
      segments.isLoading ||
      quotas.isLoading ||
      bounces.isLoading,
    isError:
      stats.isError ||
      health.isError ||
      campaigns.isError ||
      automations.isError ||
      segments.isError ||
      quotas.isError ||
      bounces.isError,
    error:
      stats.error ||
      health.error ||
      campaigns.error ||
      automations.error ||
      segments.error ||
      quotas.error ||
      bounces.error,
    refetch: () => {
      stats.refetch();
      health.refetch();
      campaigns.refetch();
      automations.refetch();
      segments.refetch();
      quotas.refetch();
      bounces.refetch();
    },
  };
}
