/**
 * Auth API shared types
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthContext {
  supabase: SupabaseClient;
  requestId: string;
  corsHeaders: Record<string, string>;
  clientIp: string | null;
}
