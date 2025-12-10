"use server";

import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, invalidateTag } from "@/lib/data/cache-keys";
import { requireAdmin, logAdminAction } from "@/lib/data/admin-auth";

export interface AdminUser {
  id: string;
  first_name: string | null;
  second_name: string | null;
  email: string;
  created_time: string | null;
  is_active: boolean;
  products_count: number;
  roles?: string[];
}

export interface UserFilters {
  search?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Approve a listing
 */
export async function approveListing(id: number): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("posts").update({ is_active: true }).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminAction("approve_listing", "post", String(id), adminId, { listing_id: id });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PRODUCTS);
  invalidateTag(CACHE_TAGS.PRODUCT(id));

  return { success: true };
}

/**
 * Reject a listing
 */
export async function rejectListing(
  id: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminAction("reject_listing", "post", String(id), adminId, { listing_id: id, reason });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);

  return { success: true };
}

/**
 * Get users list with filters
 */
export async function getUsers(filters: UserFilters = {}): Promise<{
  users: AdminUser[];
  total: number;
}> {
  await requireAdmin();
  const supabase = await createClient();
  void filters; // Used below

  const { search, role, is_active, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("profiles")
    .select("id, first_name, second_name, email, created_time, is_active", { count: "exact" });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,second_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (is_active !== undefined) {
    query = query.eq("is_active", is_active);
  }

  query = query.order("created_time", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) throw new Error(error.message);

  // Get product counts and roles for each user
  const usersWithData = await Promise.all(
    (data ?? []).map(async (user) => {
      const [{ count: productsCount }, { data: userRoles }] = await Promise.all([
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("profile_id", user.id),
        supabase.from("user_roles").select("roles!inner(name)").eq("profile_id", user.id),
      ]);

      const roles = (userRoles ?? [])
        .map((r) => {
          const roleData = r.roles as unknown as { name: string } | { name: string }[];
          return Array.isArray(roleData) ? roleData[0]?.name : roleData?.name;
        })
        .filter(Boolean) as string[];

      return {
        ...user,
        products_count: productsCount ?? 0,
        roles,
      };
    })
  );

  // Filter by role if specified
  let filteredUsers = usersWithData;
  if (role && role !== "all") {
    filteredUsers = usersWithData.filter((u) => u.roles?.includes(role));
  }

  return {
    users: filteredUsers,
    total: count ?? 0,
  };
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  // Prevent changing own role
  if (adminId === userId) {
    return { success: false, error: "Cannot change your own role" };
  }

  // Get role_id from roles table
  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", role)
    .single();

  if (roleError || !roleData) {
    return { success: false, error: `Role '${role}' not found` };
  }

  // Insert into user_roles (upsert to avoid duplicates)
  const { error } = await supabase
    .from("user_roles")
    .upsert({ profile_id: userId, role_id: roleData.id }, { onConflict: "profile_id,role_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAdminAction("update_user_roles", "profile", userId, adminId, {
    target_user_id: userId,
    new_role: role,
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PROFILES);

  return { success: true };
}

/**
 * Ban a user
 */
export async function banUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const adminId = await requireAdmin();
  const supabase = await createClient();

  // Prevent banning yourself
  if (adminId === userId) {
    return { success: false, error: "Cannot ban yourself" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false, ban_reason: reason })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Deactivate all user's listings
  await supabase.from("posts").update({ is_active: false }).eq("profile_id", userId);

  await logAdminAction("ban_user", "profile", userId, adminId, {
    target_user_id: userId,
    reason,
  });

  invalidateTag(CACHE_TAGS.ADMIN);
  invalidateTag(CACHE_TAGS.PROFILES);
  invalidateTag(CACHE_TAGS.PRODUCTS);

  return { success: true };
}
