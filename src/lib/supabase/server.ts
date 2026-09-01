// server-only guard — static import can fail in Bun test environments even when
// the mock is registered, causing a SyntaxError that hides all named exports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
try {
  require("server-only");
} catch {
  /* safe in tests/builds */
}

/**
 * Supabase Server Configuration for Next.js App Router
 * Cookie-based session handling for Server Components and Server Actions
 *
 * Imports are inside functions to prevent SyntaxError that hides named exports
 * in CI Bun test runs. Module-level static imports fail to resolve when
 * mock.module paths don't match CI's resolved module paths.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || "";

if (!supabaseUrl || !supabaseAnonKey) {
  if (
    process.env.NODE_ENV !== "test" &&
    process.env.SKIP_ENV_VALIDATION !== "true" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for Server Components and Server Actions
 * Uses cookies for session management (required for auth in App Router)
 * Includes error handling for corrupted cookies
 */
export async function createClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createServerClient } = require("@supabase/ssr");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require("next/headers");
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        try {
          return cookieStore.getAll();
        } catch (error) {
          console.error("Error reading cookies:", error);
          return [];
        }
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: {
              name: string;
              value: string;
              options?: Record<string, unknown>;
            }) => {
              cookieStore.set(name, value, {
                ...options,
                domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || options?.domain,
              });
            }
          );
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
