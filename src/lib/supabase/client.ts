/**
 * Supabase Client Configuration
 * Uses @supabase/ssr for proper cookie-based PKCE OAuth flow
 * Required for server-side callback to exchange auth codes
 *
 * @module lib/supabase/client
 */

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// NOTE: Cookie corruption detection was removed as it was causing false positives
// and deleting valid auth cookies, leading to unexpected logouts.
// Supabase handles invalid cookies gracefully on its own.

/**
 * Singleton Supabase client instance for browser
 * Uses @supabase/ssr createBrowserClient for:
 * - Cookie-based session storage (works with server-side routes)
 * - PKCE OAuth flow (code_verifier stored in cookies)
 * - Automatic token refresh
 */
export const supabase: SupabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      flowType: "pkce",
      debug: process.env.NODE_ENV === "development",
      // Note: Using default storageKey to match server-side cookie handling
    },
    global: {
      headers: {
        "x-application-name": "foodshare-web",
        "x-client-version": "2.0.0",
      },
    },
  }
);

// For backwards compatibility
export const createClient = () => supabase;

// Storage health check (always true with cookie-based SSR client)
// The SSR client handles storage gracefully
export const isStorageHealthy = true;
