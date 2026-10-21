// server-only guard — static import can fail in Bun test environments
// Using dynamic import to avoid ESM require errors in CI
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (typeof require !== "undefined") require("server-only");
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
 * Creates a Supabase client that does NOT read cookies — i.e. it runs as the
 * `anon` role, not as the signed-in user.
 *
 * The name is historical and misleading: this function performs no caching and
 * must not be read as a hint to cache its result. It exists for the opposite
 * reason — `unstable_cache()` cannot wrap a callback that calls `cookies()`,
 * so this is the escape hatch for when a cached function needs a Supabase
 * client at all.
 *
 * ── Do not cache a result from this client unless it is user-independent ────
 *
 * `unstable_cache` keys on the function's arguments, NOT on the caller. Several
 * of the functions built on this client take a user id and filter by it —
 * `getUserProducts`, `getUserChallenges`, `getUserStats`, `getProfile`,
 * `getPublicProfile`, `getProfileReviews`, `hasUserReportedPost`. Wrapping any
 * of those in `unstable_cache(fn)` without threading the id into the key
 * returns the FIRST user's rows to EVERY caller: a cross-account data leak.
 *
 * If you need caching for a per-user query, either include the user id in the
 * cache key arguments, or use the cookie-aware `createClient()` above and
 * accept that it opts the route into dynamic rendering.
 *
 * Because this client is `anon`, RLS is the only thing separating one user's
 * rows from another's here. Keep that in mind before loosening any policy.
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
