/**
 * Supabase Client Factory
 *
 * Per-request Supabase client construction for edge handlers.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { createClient } from "@supabase/supabase-js";

export function createSupabaseClient(authHeader?: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
