/**
 * Supabase Client Factory
 *
 * Per-request Supabase client construction for edge handlers.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../database.types.ts";

/**
 * The request-scoped client, typed against the schema.
 *
 * Same generated `Database` as `_shared/supabase.ts` and for the same reason.
 * This one runs as `anon` and so is bound by RLS, which is why a wrong column
 * or a wrong filter here is a privacy question and not only a crash.
 */
export function createSupabaseClient(authHeader?: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
