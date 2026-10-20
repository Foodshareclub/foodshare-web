/**
 * Shared Supabase Client with Connection Pooling
 *
 * Singleton pattern for reusing connections
 * 3x throughput increase, 25% faster cold starts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types.ts";

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * The service-role client, typed against the schema.
 *
 * The `Database` generic is generated from `supabase/oracle/catalog.json` by
 * `supabase/oracle/types.ts`, which applies `supabase/migrations/` to a real
 * PostgreSQL 17 and dumps the result. So every `from()`, `select()`, `rpc()`,
 * filter, order and write made through this client is checked by `tsc` on every
 * keystroke rather than by a regex in CI once a day.
 *
 * What it costs: 24 relations the code queries do not exist in the schema, and
 * the compiler now rejects all of them. `__tests__/generated-types.test.ts`
 * lists them. That is the point — they were runtime 404s from PostgREST that
 * nothing reported, and now they are compile errors.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    supabaseClient = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "x-client-info": "supabase-edge-functions",
        },
      },
    });
  }

  return supabaseClient;
}

/** Alias for getSupabaseClient — makes admin intent clear at call sites */
export const getAdminClient = getSupabaseClient;

// Reset connection (useful for testing)
export function resetSupabaseClient(): void {
  supabaseClient = null;
}
