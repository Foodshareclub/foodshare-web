/**
 * Supabase Server Configuration for Next.js App Router
 * Cookie-based session handling for Server Components and Server Actions
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Module-level loading with empty string fallback for build-time safety
// The actual check happens at runtime in the functions that use these
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function ensureConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
}

/**
 * Creates a Supabase client for cached data fetching (no cookies)
 * Use this inside unstable_cache() where cookies() cannot be called
 */
export function createCachedClient() {
  ensureConfig();
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Safely get all cookies, filtering out corrupted ones
 * This prevents "Invalid UTF-8 sequence" errors from crashing the app
 */
function getSafeCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  try {
    const allCookies = cookieStore.getAll();
    // Filter out potentially corrupted Supabase auth cookies
    return allCookies.filter((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        try {
          // Test if the value can be safely decoded
          // Supabase cookies are base64url encoded
          if (cookie.value) {
            // Simple validation - check for valid base64url characters
            const base64urlRegex = /^[A-Za-z0-9_-]*$/;
            const parts = cookie.value.split(".");
            const isValid = parts.every((part) => base64urlRegex.test(part) || part === "");
            if (!isValid) {
              console.warn(`Filtering corrupted Supabase cookie: ${cookie.name}`);
              return false;
            }
          }
          return true;
        } catch {
          console.warn(`Filtering invalid cookie: ${cookie.name}`);
          return false;
        }
      }
      return true;
    });
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
  ensureConfig();
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
