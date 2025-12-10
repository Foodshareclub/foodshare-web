/**
 * Admin Authentication Utilities
 * Single source of truth for admin role checking
 */

import { createClient } from "@/lib/supabase/server";

export interface AdminAuthResult {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  userId: string | null;
  roles: string[];
}

/**
 * Check if user has admin privileges
 * Uses user_roles table as source of truth
 */
export async function getAdminAuth(): Promise<AdminAuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, isSuperAdmin: false, userId: null, roles: [] };
  }

  const { data: userRoles, error } = await supabase
    .from("user_roles")
    .select("roles!inner(name)")
    .eq("profile_id", user.id);

  if (error || !userRoles) {
    return { isAdmin: false, isSuperAdmin: false, userId: user.id, roles: [] };
  }

  const roles = userRoles.map((r) => (r.roles as unknown as { name: string }).name).filter(Boolean);

  const isAdmin = roles.includes("admin") || roles.includes("superadmin");
  const isSuperAdmin = roles.includes("superadmin");

  return { isAdmin, isSuperAdmin, userId: user.id, roles };
}

/**
 * Require admin access - throws if not admin
 * Use in Server Actions for mutations
 */
export async function requireAdmin(): Promise<string> {
  const { isAdmin, userId } = await getAdminAuth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return userId;
}

/**
 * Require superadmin access - throws if not superadmin
 */
export async function requireSuperAdmin(): Promise<string> {
  const { isSuperAdmin, userId } = await getAdminAuth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  if (!isSuperAdmin) {
    throw new Error("Super admin access required");
  }

  return userId;
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId: string,
  adminId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const supabase = await createClient();

  await supabase.from("admin_audit_log").insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    admin_id: adminId,
    metadata,
  });
}
