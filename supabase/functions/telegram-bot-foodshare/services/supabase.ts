/**
 * Supabase client service with connection pooling
 */

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@^2.47.10";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../config/index.ts";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
      db: { schema: "public" },
    });
  }

  return supabaseClient;
}
