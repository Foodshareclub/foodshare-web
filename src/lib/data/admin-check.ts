import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface AdminCheckResult {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  roles: string[];
  userId: string | null;
}

/** Result of {@link guardAdmin}: a discriminator, not a throw. */
export type AdminGuard = { ok: true; adminId: string } | { ok: false; error: string };

interface UserRoleRow {
  roles: { name: string } | { name: string }[] | null;
}

/**
 * Check if a user has admin privileges
 * Uses admin client to bypass RLS on user_roles table
 *
 * @param userId - The user's profile ID
 * @returns Object with isAdmin boolean and array of role names
 */
export async function checkUserIsAdmin(userId: string): Promise<AdminCheckResult> {
  try {
    const supabase = createAdminClient();

    const { data: userRoles, error } = await supabase.from("user_roles").select("roles(name)").eq("profile_id", userId);

    if (error) {
      console.error("[checkUserIsAdmin] Query error:", error.message);
      return { isAdmin: false, isSuperAdmin: false, roles: [], userId };
    }

    const roles = ((userRoles || []) as UserRoleRow[])
      .map((r) => (Array.isArray(r.roles) ? r.roles[0]?.name : r.roles?.name))
      .filter((name): name is string => typeof name === "string");

    const isSuperAdmin = roles.includes("superadmin");
    const isAdmin = roles.includes("admin") || isSuperAdmin;

    return { isAdmin, isSuperAdmin, roles, userId };
  } catch (error) {
    console.error("[checkUserIsAdmin] Error:", error);
    return { isAdmin: false, isSuperAdmin: false, roles: [], userId };
  }
}

/**
 * Get current admin auth state for the logged-in user
 */
export async function getAdminAuth(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, isSuperAdmin: false, roles: [], userId: null };
  }

  return checkUserIsAdmin(user.id);
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
 * `requireAdmin()` for actions that return a result object instead of throwing.
 *
 * `requireAdmin` throws, which is right for a guard whose failure the caller
 * cannot express — and wrong for an action that has to answer
 * `{ success: false, error }`. Those actions re-implemented the check, and
 * most of them re-implemented it *wrongly*: several admin action modules
 * checked only that a session existed and left the role check to an RLS
 * policy on the far side of a service-role client. That is defence in depth
 * with nothing underneath it — one policy typo from privilege escalation, in
 * the module whose own header claims "all actions require admin".
 */
export async function guardAdmin(): Promise<AdminGuard> {
  try {
    return { ok: true, adminId: await requireAdmin() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Admin access required" };
  }
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(
  action: string,
  resourceType: string,
  resourceId: string,
  adminId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  // Use admin client to ensure logs are always written
  const supabase = createAdminClient();

  await supabase.from("admin_audit_log").insert({
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    admin_id: adminId,
    metadata,
  });
}
