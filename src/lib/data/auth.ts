/**
 * Auth Data Functions
 * Server-side data fetching for authentication
 * Uses unstable_cache for server-side caching with tag-based invalidation.
 */

import { unstable_cache } from "next/cache";
import { CACHE_TAGS, CACHE_DURATIONS } from "./cache-keys";
import { createClient } from "@/lib/supabase/server";

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
    nickname?: string | null;
    avatar_url: string | null;
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
        .select("id, first_name, second_name, nickname, avatar_url, email")
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
 * Uses user_roles table as source of truth
 */
export async function checkIsAdmin(userId: string): Promise<{
  isAdmin: boolean;
  roles: string[];
  jsonbRoles: Record<string, boolean>;
}> {
  try {
    const supabase = await createClient();

    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("roles!inner(name)")
      .eq("profile_id", userId);

    const roles = (userRoles || []).map((r) => (r.roles as unknown as { name: string }).name);
    const isAdmin = roles.includes("admin") || roles.includes("superadmin");

    // Build jsonbRoles for backward compatibility
    const jsonbRoles: Record<string, boolean> = {};
    roles.forEach((role) => {
      jsonbRoles[role] = true;
    });

    return { isAdmin, roles, jsonbRoles };
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
