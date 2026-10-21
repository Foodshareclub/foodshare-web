/**
 * Edge-compatible Supabase client (Enterprise-grade)
 *
 * For use in Edge Runtime (e.g., OG images, edge functions).
 * Uses the standard @supabase/supabase-js client with anon key.
 *
 * Features:
 * - Singleton pattern: Reuses client across requests
 * - 5-second timeout: Prevents hanging requests
 * - No cookies: Works in Edge Runtime (unlike @supabase/ssr)
 *
 * Security:
 * - Anon key is designed for public/anonymous access
 * - RLS policies control what data can be accessed
 * - No user-specific data is exposed
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Singleton instance for connection reuse
let edgeClient: SupabaseClient | null = null;

/**
 * Get edge-compatible Supabase client
 * Uses singleton pattern for connection reuse across requests
 */
export function createEdgeClient(): SupabaseClient {
  if (edgeClient) return edgeClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  edgeClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // 5-second timeout to prevent hanging requests
      fetch: ((url: URL | RequestInfo, options: RequestInit = {}) =>
        fetch(url, {
          ...options,
          signal: AbortSignal.timeout(5000),
        })) as typeof fetch,
    },
  });

  return edgeClient;
}
