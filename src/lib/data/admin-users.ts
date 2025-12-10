/**
 * Admin Users Data Layer
 * Server-side data fetching for admin user management
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient } from "@/lib/supabase/server";

// ============================================================================
// Types
// ============================================================================

export interface AdminUserProfile {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_time: string;
  last_seen_at: string | null;
  roles?: string[];
}

export interface AdminUsersFilter {
  search?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "created_time" | "last_seen_at" | "first_name" | "email";
  sortOrder?: "asc" | "desc";
}

export interface AdminUsersResult {
  users: AdminUserProfile[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  active: number;
  verified: number;
  admins: number;
  newThisWeek: number;
}

// ============================================================================
// Data Functions
// ============================================================================

/**
 * Get admin users with filters and pagination
 */
export async function getAdminUsers(filters: AdminUsersFilter = {}): Promise<AdminUsersResult> {
  const supabase = await createClient();

  const {
    search,
    role,
    isActive,
    page = 1,
    limit = 20,
    sortBy = "created_time",
    sortOrder = "desc",
  } = filters;

  const offset = (page - 1) * limit;

  // Build base query with user_roles join
  let query = supabase.from("profiles").select(
    `
      id,
      first_name,
      second_name,
      email,
      avatar_url,
      is_active,
      is_verified,
      created_time,
      last_seen_at,
      user_roles(roles(name))
    `,
    { count: "exact" }
  );

  // Apply search filter
  if (search?.trim()) {
    query = query.or(
      `first_name.ilike.%${search}%,second_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  // Apply active filter
  if (isActive !== undefined) {
    query = query.eq("is_active", isActive);
  }

  // Apply sorting
  query = query.order(sortBy, { ascending: sortOrder === "asc" });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  // Transform data to extract roles from user_roles join
  const users: AdminUserProfile[] = (data ?? []).map((user) => {
    // Supabase returns user_roles as array with nested roles object
    const userRoles = (user.user_roles as unknown as Array<{ roles: { name: string } | null }>) ?? [];
    const roles = userRoles.map((ur) => ur.roles?.name).filter((name): name is string => !!name);

    return {
      id: user.id,
      first_name: user.first_name,
      second_name: user.second_name,
      email: user.email,
      avatar_url: user.avatar_url,
      is_active: user.is_active,
      is_verified: user.is_verified,
      created_time: user.created_time,
      last_seen_at: user.last_seen_at,
      roles,
    };
  });

  // Filter by role if specified (post-query filtering)
  let filteredUsers = users;
  if (role && role !== "all") {
    filteredUsers = users.filter((u) => u.roles?.includes(role));
  }

  return {
    users: filteredUsers,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

/**
 * Get cached admin users
 */
export const getCachedAdminUsers = unstable_cache(
  async (filters: AdminUsersFilter = {}): Promise<AdminUsersResult> => {
    return getAdminUsers(filters);
  },
  ["admin-users"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.PROFILES, CACHE_TAGS.ADMIN],
  }
);

/**
 * Get single user by ID for admin
 */
export async function getAdminUserById(id: string): Promise<AdminUserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      second_name,
      email,
      avatar_url,
      is_active,
      is_verified,
      created_time,
      last_seen_at
    `
    )
    .eq("id", id)
    .single();

  if (error) return null;

  return data as AdminUserProfile;
}

/**
 * Get user statistics for admin dashboard
 */
export const getUserStats = unstable_cache(
  async (): Promise<UserStats> => {
    const supabase = await createClient();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      { count: total },
      { count: active },
      { count: verified },
      { count: admins },
      { count: newThisWeek },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
      // Count admins from user_roles table
      supabase.from("user_roles").select("*", { count: "exact", head: true }).in("role_id", [6]), // admin role_id = 6
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_time", oneWeekAgo.toISOString()),
    ]);

    return {
      total: total ?? 0,
      active: active ?? 0,
      verified: verified ?? 0,
      admins: admins ?? 0,
      newThisWeek: newThisWeek ?? 0,
    };
  },
  ["admin-user-stats"],
  {
    revalidate: CACHE_DURATIONS.ADMIN_STATS,
    tags: [CACHE_TAGS.ADMIN_STATS, CACHE_TAGS.ADMIN],
  }
);
