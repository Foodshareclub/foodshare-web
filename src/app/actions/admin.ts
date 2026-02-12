"use server";

/**
 * Admin Server Actions
 * Bleeding-edge implementation with:
 * - Zod schema validation
 * - Type-safe action results
 * - Audit logging
 * - Proper admin auth via user_roles
 * - Dual-mode routing (Edge Functions when enabled)
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import type { ErrorCode } from "@/lib/errors";
import { escapeFilterValue } from "@/lib/utils";
import { checkUserIsAdmin } from "@/lib/data/admin-check";
import { banUserAPI, unbanUserAPI, updateUserRoleAPI } from "@/lib/api";

// Feature flag for Edge Function migration
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS_FOR_ADMIN === "true";

// ============================================================================
// Zod Schemas
// ============================================================================

const UserFiltersSchema = z.object({
  search: z.string().max(100).optional(),
  role: z.string().max(50).optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.string().min(1, "Role is required").max(50),
});

const BanUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z.string().min(1, "Ban reason is required").max(500),
});

const RejectListingSchema = z.object({
  id: z.number().int().positive("Invalid listing ID"),
  reason: z.string().min(1, "Rejection reason is required").max(500),
});

// ============================================================================
// Types
// ============================================================================

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

export type UserFilters = z.input<typeof UserFiltersSchema>;

// ============================================================================
// Helper: Verify Admin Access
// ============================================================================

type AuthError = { error: string; code: ErrorCode };
type AuthSuccess = {
  user: { id: string };
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function verifyAdminAccess(): Promise<AuthError | AuthSuccess> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be logged in", code: "UNAUTHORIZED" };
  }

  const { isAdmin } = await checkUserIsAdmin(user.id);

  if (!isAdmin) {
    return { error: "Admin access required", code: "FORBIDDEN" };
  }

  return { user: { id: user.id }, supabase };
}

function isAuthError(result: AuthError | AuthSuccess): result is AuthError {
  return "error" in result && "code" in result && !("supabase" in result);
}

// ============================================================================
// Audit Logging Helper
// ============================================================================

async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.rpc("log_audit_event", {
      p_user_id: userId,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_metadata: metadata || {},
    });
  } catch (err) {
    console.warn(`[audit] Failed to log: ${action} ${resourceType}:${resourceId}`, err);
  }
}

// ============================================================================
// Listing Actions
// ============================================================================

/**
 * Approve a listing
 */
export async function approveListing(id: number): Promise<ServerActionResult<void>> {
  try {
    // Validate ID
    if (!id || !Number.isInteger(id) || id <= 0) {
      return serverActionError("Invalid listing ID", "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if listing exists
    const { data: listing } = await supabase
      .from("posts")
      .select("id, post_name")
      .eq("id", id)
      .single();

    if (!listing) {
      return serverActionError("Listing not found", "NOT_FOUND");
    }

    const { error } = await supabase.from("posts").update({ is_active: true }).eq("id", id);

    if (error) {
      console.error("Failed to approve listing:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "APPROVE_LISTING", "post", String(id), {
      listing_name: listing.post_name,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.PRODUCTS);
    invalidateTag(CACHE_TAGS.PRODUCT(id));
    revalidatePath("/admin");

    return successVoid();
  } catch (error) {
    console.error("Failed to approve listing:", error);
    return serverActionError("Failed to approve listing", "UNKNOWN_ERROR");
  }
}

/**
 * Reject a listing
 */
export async function rejectListing(id: number, reason: string): Promise<ServerActionResult<void>> {
  try {
    // Validate input
    const validated = RejectListingSchema.safeParse({ id, reason });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if listing exists
    const { data: listing } = await supabase
      .from("posts")
      .select("id, post_name, profile_id")
      .eq("id", id)
      .single();

    if (!listing) {
      return serverActionError("Listing not found", "NOT_FOUND");
    }

    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) {
      console.error("Failed to reject listing:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "REJECT_LISTING", "post", String(id), {
      listing_name: listing.post_name,
      reason,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.ADMIN_LISTINGS);
    revalidatePath("/admin");

    return successVoid();
  } catch (error) {
    console.error("Failed to reject listing:", error);
    return serverActionError("Failed to reject listing", "UNKNOWN_ERROR");
  }
}

// ============================================================================
// User Management Actions
// ============================================================================

interface GetUsersResult {
  users: AdminUser[];
  total: number;
}

/**
 * Get users list with filters
 */
export async function getUsers(
  filters: UserFilters = {}
): Promise<ServerActionResult<GetUsersResult>> {
  try {
    // Validate filters
    const validated = UserFiltersSchema.safeParse(filters);
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      return serverActionError(firstError.message, "VALIDATION_ERROR");
    }

    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase } = auth;
    const { search, role, is_active, page, limit } = validated.data;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("profiles")
      .select("id, first_name, second_name, email, created_time, is_active", { count: "exact" });

    if (search) {
      const safeSearch = escapeFilterValue(search);
      query = query.or(
        `first_name.ilike.%${safeSearch}%,second_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`
      );
    }

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active);
    }

    query = query.order("created_time", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Failed to get users:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

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
      success: true,
      data: {
        users: filteredUsers,
        total: count ?? 0,
      },
    };
  } catch (error) {
    console.error("Failed to get users:", error);
    return serverActionError("Failed to get users", "UNKNOWN_ERROR");
  }
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: string
): Promise<ServerActionResult<void>> {
  // Validate input
  const validated = UpdateUserRoleSchema.safeParse({ userId, role });
  if (!validated.success) {
    const firstError = validated.error.issues[0];
    return serverActionError(firstError.message, "VALIDATION_ERROR");
  }

  // ==========================================================================
  // Edge Function Path (when enabled)
  // ==========================================================================
  if (USE_EDGE_FUNCTIONS) {
    const result = await updateUserRoleAPI(userId, role);

    if (result.success) {
      invalidateTag(CACHE_TAGS.ADMIN);
      invalidateTag(CACHE_TAGS.PROFILES);
      revalidatePath("/admin");
      return successVoid();
    }

    return serverActionError(
      result.error?.message || "Failed to update user role",
      "UNKNOWN_ERROR"
    );
  }

  // ==========================================================================
  // Direct Supabase Path (fallback)
  // ==========================================================================
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Prevent changing own role
    if (user.id === userId) {
      return serverActionError("Cannot change your own role", "VALIDATION_ERROR");
    }

    // Get role_id from roles table
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role)
      .single();

    if (roleError || !roleData) {
      return serverActionError(`Role '${role}' not found`, "NOT_FOUND");
    }

    // Insert into user_roles (upsert to avoid duplicates)
    const { error } = await supabase
      .from("user_roles")
      .upsert({ profile_id: userId, role_id: roleData.id }, { onConflict: "profile_id,role_id" });

    if (error) {
      console.error("Failed to update user role:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "UPDATE_USER_ROLE", "profile", userId, {
      new_role: role,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.PROFILES);
    revalidatePath("/admin");

    return successVoid();
  } catch (error) {
    console.error("Failed to update user role:", error);
    return serverActionError("Failed to update user role", "UNKNOWN_ERROR");
  }
}

/**
 * Ban a user
 */
export async function banUser(userId: string, reason: string): Promise<ServerActionResult<void>> {
  // Validate input
  const validated = BanUserSchema.safeParse({ userId, reason });
  if (!validated.success) {
    const firstError = validated.error.issues[0];
    return serverActionError(firstError.message, "VALIDATION_ERROR");
  }

  // ==========================================================================
  // Edge Function Path (when enabled)
  // ==========================================================================
  if (USE_EDGE_FUNCTIONS) {
    const result = await banUserAPI(userId, reason);

    if (result.success) {
      invalidateTag(CACHE_TAGS.ADMIN);
      invalidateTag(CACHE_TAGS.PROFILES);
      invalidateTag(CACHE_TAGS.PRODUCTS);
      revalidatePath("/admin");
      return successVoid();
    }

    return serverActionError(result.error?.message || "Failed to ban user", "UNKNOWN_ERROR");
  }

  // ==========================================================================
  // Direct Supabase Path (fallback)
  // ==========================================================================
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Prevent banning yourself
    if (user.id === userId) {
      return serverActionError("Cannot ban yourself", "VALIDATION_ERROR");
    }

    // Check if user exists
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id, first_name, second_name, email")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return serverActionError("User not found", "NOT_FOUND");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false, ban_reason: reason })
      .eq("id", userId);

    if (error) {
      console.error("Failed to ban user:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Deactivate all user's listings
    await supabase.from("posts").update({ is_active: false }).eq("profile_id", userId);

    // Audit log
    await logAuditEvent(supabase, user.id, "BAN_USER", "profile", userId, {
      target_email: targetUser.email,
      reason,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.PROFILES);
    invalidateTag(CACHE_TAGS.PRODUCTS);
    revalidatePath("/admin");

    return successVoid();
  } catch (error) {
    console.error("Failed to ban user:", error);
    return serverActionError("Failed to ban user", "UNKNOWN_ERROR");
  }
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string): Promise<ServerActionResult<void>> {
  // Validate ID
  if (!userId || !z.string().uuid().safeParse(userId).success) {
    return serverActionError("Invalid user ID", "VALIDATION_ERROR");
  }

  // ==========================================================================
  // Edge Function Path (when enabled)
  // ==========================================================================
  if (USE_EDGE_FUNCTIONS) {
    const result = await unbanUserAPI(userId);

    if (result.success) {
      invalidateTag(CACHE_TAGS.ADMIN);
      invalidateTag(CACHE_TAGS.PROFILES);
      revalidatePath("/admin");
      return successVoid();
    }

    return serverActionError(result.error?.message || "Failed to unban user", "UNKNOWN_ERROR");
  }

  // ==========================================================================
  // Direct Supabase Path (fallback)
  // ==========================================================================
  try {
    const auth = await verifyAdminAccess();
    if (isAuthError(auth)) {
      return serverActionError(auth.error, auth.code);
    }

    const { supabase, user } = auth;

    // Check if user exists
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("id, email, is_active")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return serverActionError("User not found", "NOT_FOUND");
    }

    if (targetUser.is_active) {
      return serverActionError("User is not banned", "VALIDATION_ERROR");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true, ban_reason: null })
      .eq("id", userId);

    if (error) {
      console.error("Failed to unban user:", error);
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    // Audit log
    await logAuditEvent(supabase, user.id, "UNBAN_USER", "profile", userId, {
      target_email: targetUser.email,
    });

    invalidateTag(CACHE_TAGS.ADMIN);
    invalidateTag(CACHE_TAGS.PROFILES);
    revalidatePath("/admin");

    return successVoid();
  } catch (error) {
    console.error("Failed to unban user:", error);
    return serverActionError("Failed to unban user", "UNKNOWN_ERROR");
  }
}
