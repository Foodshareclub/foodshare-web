/**
 * Auth Data Functions
 * Server-side data fetching for authentication
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string | undefined;
  profile?: {
    id: string;
    first_name: string | null;
    second_name: string | null;
    nickname: string | null;
    avatar_url: string | null;
    user_role: string | null;
    email: string | null;
  } | null;
}

export interface AuthSession {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  roles: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string is a full URL (http/https)
 */
function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Resolve avatar URL to a public URL
 */
async function resolveAvatarUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarUrl: string | null
): Promise<string | null> {
  if (!avatarUrl || avatarUrl.trim() === "") return null;
  if (isFullUrl(avatarUrl)) return avatarUrl;
  const { data } = supabase.storage.from("profiles").getPublicUrl(avatarUrl);
  return data?.publicUrl || null;
}

// ============================================================================
// Data Functions
// ============================================================================

/**
 * Get current authenticated user with profile
 * Returns null if not authenticated or DB unavailable
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) return null;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, second_name, nickname, avatar_url, user_role, email")
        .eq("id", user.id)
        .single();

      const resolvedAvatarUrl = profile?.avatar_url
        ? await resolveAvatarUrl(supabase, profile.avatar_url)
        : null;

      return {
        id: user.id,
        email: user.email,
        profile: profile
          ? {
              ...profile,
              avatar_url: resolvedAvatarUrl,
            }
          : null,
      };
    } catch {
      return {
        id: user.id,
        email: user.email,
        profile: null,
      };
    }
  } catch {
    return null;
  }
}

/**
 * Check if current user is admin
 * Supports both JSONB role field and legacy user_role/user_roles table
 */
export async function checkIsAdmin(userId: string): Promise<{
  isAdmin: boolean;
  roles: string[];
  jsonbRoles: Record<string, boolean>;
}> {
  try {
    const supabase = await createClient();

    // Get profile with JSONB role field and legacy user_role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, user_role")
      .eq("id", userId)
      .single();

    // Check JSONB role field first (new system)
    const jsonbRoles = (profile?.role as Record<string, boolean>) || {};
    const isJsonbAdmin = jsonbRoles.admin === true;

    // Check legacy user_role field
    const isLegacyAdmin = profile?.user_role === "admin" || profile?.user_role === "superadmin";

    // Also check user_roles junction table for backwards compatibility
    const { data: userRolesData } = await supabase
      .from("user_roles")
      .select("role_id, roles!user_roles_role_id_fkey(name)")
      .eq("profile_id", userId);

    const tableRoles = (userRolesData ?? []).flatMap((r) => {
      const roleName = (r as { roles?: { name?: string } }).roles?.name;
      return roleName ? [roleName] : [];
    });

    const isTableAdmin = tableRoles.includes("admin") || tableRoles.includes("superadmin");

    // Combine all role sources
    const allRoles = [
      ...new Set([
        ...tableRoles,
        ...Object.entries(jsonbRoles)
          .filter(([_, v]) => v === true)
          .map(([k]) => k),
        ...(isLegacyAdmin ? [profile?.user_role as string] : []),
      ]),
    ];

    return {
      isAdmin: isJsonbAdmin || isLegacyAdmin || isTableAdmin,
      roles: allRoles,
      jsonbRoles,
    };
  } catch {
    return { isAdmin: false, roles: [], jsonbRoles: {} };
  }
}

/**
 * Get full auth session with user, profile, and admin status
 * This is the main function for Server Components
 */
export async function getAuthSession(): Promise<
  AuthSession & { jsonbRoles?: Record<string, boolean> }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      roles: [],
    };
  }

  const { isAdmin, roles, jsonbRoles } = await checkIsAdmin(user.id);

  return {
    user,
    isAuthenticated: true,
    isAdmin,
    roles,
    jsonbRoles,
  };
}

/**
 * Get cached auth session (for pages that don't need real-time auth)
 */
export const getCachedAuthSession = unstable_cache(
  async (): Promise<AuthSession> => {
    return getAuthSession();
  },
  ["auth-session"],
  {
    revalidate: CACHE_DURATIONS.SHORT,
    tags: [CACHE_TAGS.AUTH, CACHE_TAGS.SESSION],
  }
);
