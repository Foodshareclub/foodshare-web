/**
 * Supabase Admin Client (Service Role)
 *
 * For server-side operations requiring elevated privileges:
 * - Accessing vault.decrypted_secrets
 * - Bypassing RLS policies
 * - Admin operations
 *
 * SECURITY: Never expose service role key to client.
 * Only use in Route Handlers, Server Actions, and server-side code.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Creates a Supabase admin client with service role key
 * Uses singleton pattern for connection reuse
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials (SUPABASE_SERVICE_ROLE_KEY)");
  }

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
