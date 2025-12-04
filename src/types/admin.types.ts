/**
 * Admin CRM Type Definitions
 * Types for admin approval workflow, listings management, and CRM features
 */

import type { InitialProductStateType } from "@/types/product.types";

// =============================================================================
// POST STATUS TYPES
// =============================================================================

/**
 * Post approval status
 * - pending: Awaiting admin review
 * - approved: Visible to public
 * - rejected: Hidden, not approved
 * - flagged: Needs attention/review
 */
export type PostStatus = "pending" | "approved" | "rejected" | "flagged";

/**
 * Admin action types for audit log
 */
export type AdminActionType =
  | "approved"
  | "rejected"
  | "flagged"
  | "unflagged"
  | "status_changed"
  | "edited";

// =============================================================================
// EXTENDED POST TYPE WITH ADMIN FIELDS
// =============================================================================

/**
 * Post type extended with admin approval workflow fields
 * Includes all original post fields plus admin-specific metadata
 */
export interface PostWithAdminFields extends InitialProductStateType {
  // Status management
  status: PostStatus;

  // Approval tracking
  approved_by: string | null;
  approved_at: string | null;

  // Rejection tracking
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;

  // Flagging tracking
  flagged_by: string | null;
  flagged_at: string | null;
  flagged_reason: string | null;

  // Admin notes (internal only)
  admin_notes: string | null;
}

// =============================================================================
// AUDIT LOG TYPES
// =============================================================================

/**
 * Audit log entry for tracking admin actions on posts
 */
export interface PostAuditLog {
  id: number;
  post_id: number;
  admin_id: string;
  action: AdminActionType;
  previous_status: PostStatus | null;
  new_status: PostStatus | null;
  reason: string | null;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// ADMIN USER TYPES
// =============================================================================

/**
 * Admin user record from admin table
 */
export interface AdminUser {
  user_id: string;
  is_admin: boolean;
  created_at: string;
}

/**
 * User with admin status and additional metadata
 */
export interface UserWithAdminStatus {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_seen_at: string | null;
}

// =============================================================================
// ADMIN STATS TYPES
// =============================================================================

/**
 * Dashboard statistics for admin overview
 */
export interface AdminDashboardStats {
  // Listing counts
  totalListings: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  flaggedCount: number;

  // Activity metrics
  todaySubmissions: number;
  weeklySubmissions: number;
  monthlySubmissions: number;

  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;

  // Engagement metrics
  averageApprovalTime: number; // in hours
  approvalRate: number; // percentage
}

/**
 * Listing stats by category
 */
export interface ListingStatsByCategory {
  category: string;
  count: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// =============================================================================
// FILTER & SEARCH TYPES
// =============================================================================

/**
 * Filters for admin listings management page
 */
export interface AdminListingsFilter {
  status: PostStatus | "all";
  searchTerm: string;
  category: string | "all";
  sortBy: "created_at" | "updated_at" | "post_name" | "status";
  sortOrder: "asc" | "desc";
  dateFrom: string | null;
  dateTo: string | null;
  flaggedOnly: boolean;
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// =============================================================================
// ADMIN ACTION PAYLOADS
// =============================================================================

/**
 * Payload for approving a post
 */
export interface ApprovePostPayload {
  postId: number;
  adminNotes?: string;
}

/**
 * Payload for rejecting a post
 */
export interface RejectPostPayload {
  postId: number;
  rejectionReason: string;
  adminNotes?: string;
}

/**
 * Payload for flagging a post
 */
export interface FlagPostPayload {
  postId: number;
  flaggedReason: string;
  adminNotes?: string;
}

/**
 * Payload for updating post status
 */
export interface UpdatePostStatusPayload {
  postId: number;
  newStatus: PostStatus;
  reason?: string;
  adminNotes?: string;
}

// =============================================================================
// ADMIN STATE (Redux)
// =============================================================================

/**
 * Admin Redux state slice
 */
export interface AdminState {
  // Listings management
  listings: PostWithAdminFields[];
  listingsStatus: "idle" | "loading" | "succeeded" | "failed";
  listingsError: string | null;

  // Filters
  filters: AdminListingsFilter;

  // Pagination
  pagination: PaginationState;

  // Selected listing for detail modal
  selectedListingId: number | null;
  detailModalOpen: boolean;

  // Audit logs
  auditLogs: PostAuditLog[];
  auditLogsStatus: "idle" | "loading" | "succeeded" | "failed";

  // Dashboard stats
  dashboardStats: AdminDashboardStats | null;
  statsStatus: "idle" | "loading" | "succeeded" | "failed";

  // Users management
  users: UserWithAdminStatus[];
  usersStatus: "idle" | "loading" | "succeeded" | "failed";
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Error response
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// EXPORTS
// =============================================================================

// No default export - use named exports only
