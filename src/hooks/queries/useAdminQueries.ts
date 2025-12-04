/**
 * Admin Queries (TanStack Query)
 * Handles admin/CRM data fetching and mutations
 * Replaces Redux admin slice
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

// ============================================================================
// Types
// ============================================================================

export interface AdminListing {
  id: number;
  post_name: string;
  post_type: string;
  post_description: string;
  profile_id: string;
  is_active: boolean;
  created_at: string;
  post_views: number;
  reports_count?: number;
  status?: "pending" | "approved" | "rejected" | "flagged";
  profiles?: {
    id: string;
    first_name: string;
    second_name: string;
    email: string;
  };
}

export interface AdminFilters {
  status?: string;
  postType?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  pendingApproval: number;
  totalTransactions: number;
  flaggedContent: number;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  admin_id: string;
  details: Record<string, unknown>;
  created_at: string;
  admin?: {
    first_name: string;
    second_name: string;
  };
}

// ============================================================================
// Query Keys
// ============================================================================

export const adminKeys = {
  all: ["admin"] as const,
  listings: () => [...adminKeys.all, "listings"] as const,
  listingsList: (filters: AdminFilters) =>
    [...adminKeys.listings(), "list", filters] as const,
  listing: (id: number) => [...adminKeys.listings(), "detail", id] as const,
  flagged: () => [...adminKeys.listings(), "flagged"] as const,
  dashboard: () => [...adminKeys.all, "dashboard"] as const,
  auditLogs: () => [...adminKeys.all, "audit"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  usersList: (filters: Record<string, unknown>) =>
    [...adminKeys.users(), "list", filters] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch counts in parallel
      const [users, listings, active, pending, flagged] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("posts").select("id", { count: "exact", head: true }).gt("reports_count", 0),
      ]);

      return {
        totalUsers: users.count ?? 0,
        totalListings: listings.count ?? 0,
        activeListings: active.count ?? 0,
        pendingApproval: pending.count ?? 0,
        totalTransactions: 0, // Add actual query if needed
        flaggedContent: flagged.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
  });
}

/**
 * Get all listings with filters
 */
export function useAdminListings(filters: AdminFilters = {}) {
  return useQuery({
    queryKey: adminKeys.listingsList(filters),
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, email)
        `)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.postType) {
        query = query.eq("post_type", filters.postType);
      }
      if (filters.searchQuery) {
        query = query.ilike("post_name", `%${filters.searchQuery}%`);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return (data ?? []) as AdminListing[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get single listing by ID
 */
export function useAdminListing(listingId: number | undefined) {
  return useQuery({
    queryKey: adminKeys.listing(listingId ?? 0),
    queryFn: async () => {
      if (!listingId) return null;
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, email, phone),
          reviews(*)
        `)
        .eq("id", listingId)
        .single();
      if (error) throw error;
      return data as AdminListing;
    },
    enabled: !!listingId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get flagged listings
 */
export function useFlaggedListings() {
  return useQuery({
    queryKey: adminKeys.flagged(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:profile_id(id, first_name, second_name, email)
        `)
        .gt("reports_count", 0)
        .order("reports_count", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AdminListing[];
    },
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Get audit logs
 */
export function useAuditLogs(limit: number = 50) {
  return useQuery({
    queryKey: adminKeys.auditLogs(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          admin:admin_id(first_name, second_name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get users list
 */
export function useAdminUsers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: adminKeys.usersList(filters),
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          user_roles!user_roles_profile_id_fkey(role_id, roles!user_roles_role_id_fkey(name))
        `)
        .order("created_time", { ascending: false });

      if (filters.searchQuery) {
        query = query.or(
          `first_name.ilike.%${filters.searchQuery}%,second_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`
        );
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Approve a listing
 */
export function useApproveListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: number) => {
      const { error } = await supabase
        .from("posts")
        .update({ status: "approved", is_active: true })
        .eq("id", listingId);
      if (error) throw error;

      // Log the action
      await supabase.from("audit_logs").insert({
        action: "approve_listing",
        entity_type: "posts",
        entity_id: String(listingId),
        details: { status: "approved" },
      });

      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.listing(listingId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.listings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

/**
 * Reject a listing
 */
export function useRejectListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: number; reason?: string }) => {
      const { error } = await supabase
        .from("posts")
        .update({ status: "rejected", is_active: false })
        .eq("id", listingId);
      if (error) throw error;

      // Log the action
      await supabase.from("audit_logs").insert({
        action: "reject_listing",
        entity_type: "posts",
        entity_id: String(listingId),
        details: { status: "rejected", reason },
      });

      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.listing(listingId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.listings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

/**
 * Flag a listing
 */
export function useFlagListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: number; reason: string }) => {
      const { error } = await supabase
        .from("posts")
        .update({ status: "flagged" })
        .eq("id", listingId);
      if (error) throw error;

      // Increment reports count
      await supabase.rpc("increment_reports_count", { post_id: listingId });

      // Log the action
      await supabase.from("audit_logs").insert({
        action: "flag_listing",
        entity_type: "posts",
        entity_id: String(listingId),
        details: { reason },
      });

      return listingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.listings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.flagged() });
    },
  });
}

/**
 * Update listing status
 */
export function useUpdateListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      listingId,
      status,
      isActive,
    }: {
      listingId: number;
      status: string;
      isActive?: boolean;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (isActive !== undefined) {
        updates.is_active = isActive;
      }

      const { error } = await supabase.from("posts").update(updates).eq("id", listingId);
      if (error) throw error;

      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.listing(listingId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.listings() });
    },
  });
}

/**
 * Delete a listing (soft or hard)
 */
export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, hard = false }: { listingId: number; hard?: boolean }) => {
      if (hard) {
        const { error } = await supabase.from("posts").delete().eq("id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("posts")
          .update({ is_active: false, status: "deleted" })
          .eq("id", listingId);
        if (error) throw error;
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        action: hard ? "hard_delete_listing" : "soft_delete_listing",
        entity_type: "posts",
        entity_id: String(listingId),
        details: {},
      });

      return listingId;
    },
    onSuccess: (listingId) => {
      queryClient.removeQueries({ queryKey: adminKeys.listing(listingId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.listings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

// ============================================================================
// Convenience Hook
// ============================================================================

/**
 * Combined admin hook
 */
export function useAdmin(filters: AdminFilters = {}) {
  const stats = useDashboardStats();
  const listings = useAdminListings(filters);
  const flagged = useFlaggedListings();
  const auditLogs = useAuditLogs();

  const approveListing = useApproveListing();
  const rejectListing = useRejectListing();
  const flagListing = useFlagListing();
  const deleteListing = useDeleteListing();

  return {
    // Data
    stats: stats.data,
    listings: listings.data ?? [],
    flaggedListings: flagged.data ?? [],
    auditLogs: auditLogs.data ?? [],

    // Loading
    isLoading: listings.isLoading,
    isStatsLoading: stats.isLoading,

    // Mutations
    approve: approveListing.mutateAsync,
    reject: rejectListing.mutateAsync,
    flag: flagListing.mutateAsync,
    delete: deleteListing.mutateAsync,

    // Mutation states
    isApproving: approveListing.isPending,
    isRejecting: rejectListing.isPending,

    // Refetch
    refetch: () => {
      stats.refetch();
      listings.refetch();
      flagged.refetch();
    },
  };
}
