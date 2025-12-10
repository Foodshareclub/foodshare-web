/**
 * Admin API
 * API layer for admin CRM operations including listings management, approval workflow, and user management
 */

import { supabase } from "@/lib/supabase/client";
import type {
  PostWithAdminFields,
  PostStatus,
  PostAuditLog,
  AdminUser,
  UserWithAdminStatus,
  AdminDashboardStats,
  ListingStatsByCategory,
  ApprovePostPayload,
  RejectPostPayload,
  FlagPostPayload,
  UpdatePostStatusPayload,
} from "@/types/admin.types";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AdminAPI");

// =============================================================================
// ADMIN CHECK
// =============================================================================

/**
 * Check if current user is an admin
 * @returns Promise with admin status
 */
export const checkIsAdmin = async (): Promise<{ isAdmin: boolean; error: Error | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isAdmin: false, error: null };
    }

    // Use the new role system
    const { data, error } = await supabase
      .from("user_roles")
      .select("role_id, roles!inner(name)")
      .eq("profile_id", user.id)
      .eq("roles.name", "admin")
      .maybeSingle();

    if (error) {
      logger.error("Error checking admin status", error);
      return { isAdmin: false, error };
    }

    return { isAdmin: !!data, error: null };
  } catch (error) {
    logger.error("Exception checking admin status", error as Error);
    return { isAdmin: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/**
 * Get all roles for current user
 * @returns Promise with user roles
 */
export const getUserRoles = async (): Promise<{
  roles: string[];
  error: Error | null;
}> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { roles: [], error: null };
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", user.id);

    if (error) {
      logger.error("Error fetching user roles", error);
      return { roles: [], error };
    }

    const roles = data?.map((item: { roles: { name: string }[] }) => item.roles[0]?.name).filter(Boolean) as string[] || [];
    return { roles, error: null };
  } catch (error) {
    logger.error("Exception fetching user roles", error as Error);
    return { roles: [], error: error as Error };
  }
};

// =============================================================================
// LISTINGS MANAGEMENT
// =============================================================================

/**
 * Get all listings (admin view) with optional filters
 * Uses posts_with_location view for proper PostGIS coordinate parsing
 */
export const getAllListings = (filters?: {
  status?: PostStatus | "all";
  searchTerm?: string;
  category?: string | "all";
  sortBy?: "created_at" | "updated_at" | "post_name" | "status";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) => {
  let query = supabase.from("posts_with_location").select("*, reviews(*)", { count: "exact" });

  // Apply status filter
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  // Apply category filter
  if (filters?.category && filters.category !== "all") {
    query = query.eq("post_type", filters.category);
  }

  // Apply search filter
  if (filters?.searchTerm && filters.searchTerm.trim()) {
    query = query.textSearch("post_name", filters.searchTerm, {
      type: "websearch",
    });
  }

  // Apply sorting
  const sortBy = filters?.sortBy || "created_at";
  const sortOrder = filters?.sortOrder || "desc";
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  if (filters?.limit) {
    query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1);
  }

  return query;
};

/**
 * Get a single listing by ID (admin view with all fields)
 * Uses posts_with_location view for proper PostGIS coordinate parsing
 */
export const getListingById = (postId: number) => {
  return supabase.from("posts_with_location").select("*, reviews(*)").eq("id", postId).single();
};

/**
 * Get pending listings count
 */
export const getPendingListingsCount = async (): Promise<{ count: number; error: Error | null }> => {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return { count: count || 0, error: error as Error | null };
};

/**
 * Get flagged listings
 * Uses posts_with_location view for proper PostGIS coordinate parsing
 */
export const getFlaggedListings = () => {
  return supabase
    .from("posts_with_location")
    .select("*,reviews(*)")
    .eq("status", "flagged")
    .order("flagged_at", { ascending: false });
};

// =============================================================================
// APPROVAL WORKFLOW
// =============================================================================

/**
 * Approve a listing
 */
export const approvePost = async (payload: ApprovePostPayload) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "approved",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      admin_notes: payload.adminNotes || null,
      // Clear rejection/flagging fields
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      flagged_by: null,
      flagged_at: null,
      flagged_reason: null,
    })
    .eq("id", payload.postId);
};

/**
 * Reject a listing
 */
export const rejectPost = async (payload: RejectPostPayload) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "rejected",
      rejected_by: user?.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: payload.rejectionReason,
      admin_notes: payload.adminNotes || null,
      // Clear approval/flagging fields
      approved_by: null,
      approved_at: null,
      flagged_by: null,
      flagged_at: null,
      flagged_reason: null,
    })
    .eq("id", payload.postId);
};

/**
 * Flag a listing for review
 */
export const flagPost = async (payload: FlagPostPayload) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "flagged",
      flagged_by: user?.id,
      flagged_at: new Date().toISOString(),
      flagged_reason: payload.flaggedReason,
      admin_notes: payload.adminNotes || null,
    })
    .eq("id", payload.postId);
};

/**
 * Unflag a listing (return to previous status)
 */
export const unflagPost = async (postId: number, returnToPending: boolean = false) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: returnToPending ? "pending" : "approved",
      flagged_by: null,
      flagged_at: null,
      flagged_reason: null,
    })
    .eq("id", postId);
};

/**
 * Update post status (generic)
 */
export const updatePostStatus = async (payload: UpdatePostStatusPayload) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  interface PostUpdateData {
    status: PostStatus;
    approved_by?: string;
    approved_at?: string;
    rejected_by?: string;
    rejected_at?: string;
    rejection_reason?: string | null;
    flagged_by?: string;
    flagged_at?: string;
    flagged_reason?: string | null;
    admin_notes?: string;
  }

  const updateData: PostUpdateData = {
    status: payload.newStatus,
  };

  // Set appropriate fields based on new status
  if (payload.newStatus === "approved") {
    updateData.approved_by = user?.id;
    updateData.approved_at = new Date().toISOString();
  } else if (payload.newStatus === "rejected") {
    updateData.rejected_by = user?.id;
    updateData.rejected_at = new Date().toISOString();
    updateData.rejection_reason = payload.reason || null;
  } else if (payload.newStatus === "flagged") {
    updateData.flagged_by = user?.id;
    updateData.flagged_at = new Date().toISOString();
    updateData.flagged_reason = payload.reason || null;
  }

  if (payload.adminNotes) {
    updateData.admin_notes = payload.adminNotes;
  }

  return supabase.from("posts").update(updateData).eq("id", payload.postId);
};

/**
 * Update admin notes for a listing
 */
export const updateAdminNotes = async (postId: number, adminNotes: string) => {
  return supabase.from("posts").update({ admin_notes: adminNotes }).eq("id", postId);
};

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Bulk approve multiple listings
 */
export const bulkApproveListings = async (postIds: number[]) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "approved",
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      flagged_by: null,
      flagged_at: null,
      flagged_reason: null,
    })
    .in("id", postIds);
};

/**
 * Bulk reject multiple listings
 */
export const bulkRejectListings = async (postIds: number[], rejectionReason: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "rejected",
      rejected_by: user?.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
      approved_by: null,
      approved_at: null,
      flagged_by: null,
      flagged_at: null,
      flagged_reason: null,
    })
    .in("id", postIds);
};

/**
 * Bulk flag multiple listings
 */
export const bulkFlagListings = async (postIds: number[], flaggedReason: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return supabase
    .from("posts")
    .update({
      status: "flagged",
      flagged_by: user?.id,
      flagged_at: new Date().toISOString(),
      flagged_reason: flaggedReason,
    })
    .in("id", postIds);
};

/**
 * Bulk delete multiple listings
 */
export const bulkDeleteListings = async (postIds: number[]) => {
  return supabase.from("posts").delete().in("id", postIds);
};

/**
 * Bulk update status for multiple listings
 */
export const bulkUpdateStatus = async (postIds: number[], newStatus: PostStatus) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  interface BulkUpdateData {
    status: PostStatus;
    approved_by?: string;
    approved_at?: string;
    rejected_by?: string;
    rejected_at?: string;
    flagged_by?: string;
    flagged_at?: string;
  }

  const updateData: BulkUpdateData = { status: newStatus };

  if (newStatus === "approved") {
    updateData.approved_by = user?.id;
    updateData.approved_at = new Date().toISOString();
  } else if (newStatus === "rejected") {
    updateData.rejected_by = user?.id;
    updateData.rejected_at = new Date().toISOString();
  } else if (newStatus === "flagged") {
    updateData.flagged_by = user?.id;
    updateData.flagged_at = new Date().toISOString();
  }

  return supabase.from("posts").update(updateData).in("id", postIds);
};

// =============================================================================
// AUDIT LOG
// =============================================================================

/**
 * Get audit log for a specific post
 */
export const getPostAuditLog = (postId: number) => {
  return supabase
    .from("post_audit_log")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
};

/**
 * Get recent audit logs (for admin dashboard)
 */
export const getRecentAuditLogs = (limit: number = 50) => {
  return supabase
    .from("post_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
};

// =============================================================================
// DASHBOARD STATS
// =============================================================================

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (): Promise<{
  data: AdminDashboardStats | null;
  error: Error | null;
}> => {
  try {
    // Get listing counts by status
    const { count: totalListings } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    const { count: pendingCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: approvedCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: rejectedCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected");

    const { count: flaggedCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "flagged");

    // Get today's submissions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todaySubmissions } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    // Get this week's submissions
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: weeklySubmissions } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo.toISOString());

    // Get this month's submissions
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const { count: monthlySubmissions } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString());

    // Get user counts
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: activeUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: newUsersThisWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_time", weekAgo.toISOString());

    // Calculate approval rate
    const approvalRate =
      totalListings && totalListings > 0 ? ((approvedCount || 0) / totalListings) * 100 : 0;

    const stats: AdminDashboardStats = {
      totalListings: totalListings || 0,
      pendingCount: pendingCount || 0,
      approvedCount: approvedCount || 0,
      rejectedCount: rejectedCount || 0,
      flaggedCount: flaggedCount || 0,
      todaySubmissions: todaySubmissions || 0,
      weeklySubmissions: weeklySubmissions || 0,
      monthlySubmissions: monthlySubmissions || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      averageApprovalTime: 0, // TODO: Calculate from audit logs
      approvalRate,
    };

    return { data: stats, error: null };
  } catch (error) {
    logger.error("Error fetching dashboard stats", error as Error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

/**
 * Get listing stats by category
 */
export const getListingStatsByCategory = async (): Promise<{
  data: ListingStatsByCategory[] | null;
  error: Error | null;
}> => {
  try {
    const categories = ["food", "volunteer", "community_fridge", "food_bank"];
    const stats: ListingStatsByCategory[] = [];

    for (const category of categories) {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("post_type", category);

      const { count: pendingCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("post_type", category)
        .eq("status", "pending");

      const { count: approvedCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("post_type", category)
        .eq("status", "approved");

      const { count: rejectedCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("post_type", category)
        .eq("status", "rejected");

      stats.push({
        category,
        count: count || 0,
        pendingCount: pendingCount || 0,
        approvedCount: approvedCount || 0,
        rejectedCount: rejectedCount || 0,
      });
    }

    return { data: stats, error: null };
  } catch (error) {
    logger.error("Error fetching category stats", error as Error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
};

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * Get all users with admin status
 */
export const getAllUsers = () => {
  // Join profiles with admin table to get admin status
  return supabase
    .from("profiles")
    .select(
      `
      id,
      email,
      first_name,
      second_name,
      avatar_url,
      is_active,
      created_time,
      last_seen_at
    `
    )
    .order("created_time", { ascending: false });
};

/**
 * Get admin users only
 * Uses user_roles table (source of truth for admin status)
 */
export const getAdminUsers = () => {
  return supabase
    .from("user_roles")
    .select("profiles!inner(id, email, first_name, second_name, avatar_url, created_time), roles!inner(name)")
    .in("roles.name", ["admin", "superadmin"]);
};

// =============================================================================
// EXPORT
// =============================================================================

export const adminAPI = {
  // Admin check
  checkIsAdmin,
  getUserRoles,

  // Listings management
  getAllListings,
  getListingById,
  getPendingListingsCount,
  getFlaggedListings,

  // Approval workflow
  approvePost,
  rejectPost,
  flagPost,
  unflagPost,
  updatePostStatus,
  updateAdminNotes,

  // Bulk operations
  bulkApproveListings,
  bulkRejectListings,
  bulkFlagListings,
  bulkDeleteListings,
  bulkUpdateStatus,

  // Audit log
  getPostAuditLog,
  getRecentAuditLogs,

  // Dashboard stats
  getDashboardStats,
  getListingStatsByCategory,

  // User management
  getAllUsers,
  getAdminUsers,
};

export default adminAPI;
