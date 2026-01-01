/**
 * Admin Users API Client
 *
 * Provides functions for calling the api-v1-admin-users Edge Function.
 * Used for admin user management operations.
 */

import { apiCall, apiGet } from "./client";
import type { ActionResult } from "@/lib/errors";

// =============================================================================
// Types
// =============================================================================

export interface AdminUser {
  id: string;
  firstName: string | null;
  secondName: string | null;
  email: string;
  createdTime: string | null;
  isActive: boolean;
  productsCount: number;
  roles: string[];
}

export interface ListUsersRequest {
  search?: string;
  role?: string;
  isActive?: string;
  page?: string;
  limit?: string;
}

export interface ListUsersResponse {
  items: AdminUser[];
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface UpdateRoleRequest {
  role: string;
}

export interface UpdateRolesRequest {
  roles: Record<string, boolean>;
}

export interface BanUserRequest {
  reason: string;
}

export interface UserActionResponse {
  userId: string;
  role?: string;
  roles?: Record<string, boolean>;
  banned?: boolean;
  unbanned?: boolean;
  updated?: boolean;
  reason?: string;
}

// =============================================================================
// API Functions
// =============================================================================

const ENDPOINT = "api-v1-admin-users";

/**
 * List users with filters
 */
export async function listUsersAPI(
  params: ListUsersRequest = {}
): Promise<ActionResult<ListUsersResponse>> {
  return apiGet<ListUsersResponse>(ENDPOINT, params as Record<string, string>);
}

/**
 * Update a user's role (single role)
 */
export async function updateUserRoleAPI(
  userId: string,
  role: string
): Promise<ActionResult<UserActionResponse>> {
  return apiCall<UserActionResponse, UpdateRoleRequest>(`${ENDPOINT}/${userId}/role`, {
    method: "PUT",
    body: { role },
  });
}

/**
 * Update a user's roles (multiple roles)
 */
export async function updateUserRolesAPI(
  userId: string,
  roles: Record<string, boolean>
): Promise<ActionResult<UserActionResponse>> {
  return apiCall<UserActionResponse, UpdateRolesRequest>(`${ENDPOINT}/${userId}/roles`, {
    method: "PUT",
    body: { roles },
  });
}

/**
 * Ban a user
 */
export async function banUserAPI(
  userId: string,
  reason: string
): Promise<ActionResult<UserActionResponse>> {
  return apiCall<UserActionResponse, BanUserRequest>(`${ENDPOINT}/${userId}/ban`, {
    method: "POST",
    body: { reason },
  });
}

/**
 * Unban a user
 */
export async function unbanUserAPI(
  userId: string
): Promise<ActionResult<UserActionResponse>> {
  return apiCall<UserActionResponse, Record<string, never>>(`${ENDPOINT}/${userId}/unban`, {
    method: "POST",
    body: {},
  });
}

// =============================================================================
// Transform Helpers
// =============================================================================

/**
 * Transform API AdminUser to web format (snake_case)
 */
export function fromAdminUserResponse(user: AdminUser): {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string;
  created_time: string | null;
  is_active: boolean;
  products_count: number;
  roles: string[];
} {
  return {
    id: user.id,
    first_name: user.firstName,
    second_name: user.secondName,
    email: user.email,
    created_time: user.createdTime,
    is_active: user.isActive,
    products_count: user.productsCount,
    roles: user.roles,
  };
}
