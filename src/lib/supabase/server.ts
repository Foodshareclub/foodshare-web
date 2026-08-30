// server-only guard — static import can fail in Bun test environments even when
// the mock is registered, causing a SyntaxError that hides all named exports.
// Use a conditional require so tests skip it while production Next.js builds
// (which strip server-only at bundle time) are unaffected.
if (process.env.NODE_ENV !== "test" && process.env.BUN_TEST !== "1") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("server-only");
}

/**
 * Supabase Server Configuration for Next.js App Router
 * Cookie-based session handling for Server Components and Server Actions
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.SKIP_ENV_VALIDATION !== "true" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    // Only throw if we are actually running the app, not building it
    console.warn(
      "⚠️ Missing Supabase environment variables. This is expected during build if they are not provided."
    );
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
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        return getSafeCookies(cookieStore);
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || options.domain,
            });
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
