/**
 * Supabase Server Configuration for Next.js App Router
 * Cookie-based session handling for Server Components and Server Actions
 */

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Creates a Supabase client for cached data fetching (no cookies)
 * Use this inside unstable_cache() where cookies() cannot be called
 */
export function createCachedClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Creates a Supabase client for Server Components and Server Actions
 * Uses cookies for session management (required for auth in App Router)
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
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
