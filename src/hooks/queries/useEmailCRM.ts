/**
 * React Query hooks for Email CRM data
 * Fetches data dynamically from API endpoints
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
// Note: Polling removed - use useEmailCRMRealtime() for live updates
export function useEmailStats() {
  return useQuery({
    queryKey: emailCRMKeys.stats(),
    queryFn: fetchStats,
    staleTime: 30000, // Consider fresh for 30 seconds
  });
}

export function useProviderHealth() {
  return useQuery({
    queryKey: emailCRMKeys.health(),
    queryFn: fetchHealth,
    staleTime: 60000, // Consider fresh for 1 minute
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: emailCRMKeys.campaigns(),
    queryFn: fetchCampaigns,
    staleTime: 60000,
  });
}

export function useAutomations() {
  return useQuery({
    queryKey: emailCRMKeys.automations(),
    queryFn: fetchAutomations,
    staleTime: 60000,
  });
}

export function useSegments() {
  return useQuery({
    queryKey: emailCRMKeys.segments(),
    queryFn: fetchSegments,
    staleTime: 120000, // Consider fresh for 2 minutes
  });
}

export function useQuotas() {
  return useQuery({
    queryKey: emailCRMKeys.quotas(),
    queryFn: fetchQuotas,
    staleTime: 30000, // Consider fresh for 30 seconds
  });
}

export function useBounceStats() {
  return useQuery({
    queryKey: emailCRMKeys.bounces(),
    queryFn: fetchBounces,
    staleTime: 60000,
  });
}

export function useEmailTemplates() {
  return useQuery({
    queryKey: emailCRMKeys.templates(),
    queryFn: fetchTemplates,
    staleTime: 300000, // Consider fresh for 5 minutes (templates rarely change)
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

// Sync provider stats from external APIs
async function syncProviderStats(provider?: string): Promise<{ success: boolean }> {
  const res = await fetch("/api/admin/email/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(provider ? { provider } : {}),
  });
  if (!res.ok) throw new Error("Failed to sync provider stats");
  return res.json();
}

export function useSyncProviderStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncProviderStats,
    onSuccess: () => {
      // Invalidate health and quotas to refresh the UI
      queryClient.invalidateQueries({ queryKey: emailCRMKeys.health() });
      queryClient.invalidateQueries({ queryKey: emailCRMKeys.quotas() });
      queryClient.invalidateQueries({ queryKey: emailCRMKeys.stats() });
    },
  });
}
