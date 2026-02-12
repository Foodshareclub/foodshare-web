import "server-only";

/**
 * Supabase Server Configuration for Next.js App Router
 * Cookie-based session handling for Server Components and Server Actions
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'test' && process.env.SKIP_ENV_VALIDATION !== 'true') {
    throw new Error("Missing Supabase environment variables");
  }
}

/**
 * Creates a Supabase client for cached data fetching (no cookies)
 * Use this inside unstable_cache() where cookies() cannot be called
 */
export function createCachedClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get all cookies from the cookie store
 * NOTE: Previous filtering logic was removed as it caused false positives
 * and filtered out valid Supabase auth cookies, breaking authentication.
 * Supabase handles invalid cookies gracefully on its own.
 */
function getSafeCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    return cookieStore.getAll();
  } catch (error) {
    console.error("Error reading cookies:", error);
    return [];
  }
}

/**
 * Creates a Supabase client for Server Components and Server Actions
 * Uses cookies for session management (required for auth in App Router)
 * Includes error handling for corrupted cookies
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return getSafeCookies(cookieStore);
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy.ts refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Legacy export for backwards compatibility during migration
 * @deprecated Use createClient() instead
 */
export { createClient as createServerClient };
