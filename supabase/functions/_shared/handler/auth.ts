/**
 * Request Authentication
 *
 * Supabase Auth user resolution for edge handlers.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// deno-lint-ignore no-explicit-any
export async function authenticateRequest(
  supabase: SupabaseClient<any, any, any>,
): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch {
    return null;
  }
}
