/**
 * Shared Admin Check Utility
 * Single source of truth for admin role verification
 * Used by both proxy.ts (middleware) and auth.ts (server components)
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminCheckResult {
  isAdmin: boolean;
  roles: string[];
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

    const { data: userRoles, error } = await supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("profile_id", userId);

    if (error) {
      console.error("[checkUserIsAdmin] Query error:", error.message);
      return { isAdmin: false, roles: [] };
    }

    const roles = (userRoles || [])
      .map((r) => (r.roles as unknown as { name: string })?.name)
      .filter(Boolean);

    const isAdmin = roles.includes("admin") || roles.includes("superadmin");

    return { isAdmin, roles };
  } catch (error) {
    console.error("[checkUserIsAdmin] Error:", error);
    return { isAdmin: false, roles: [] };
  }
}
