/**
 * Idempotency Key Support
 *
 * Check-and-store helpers backed by the `check_idempotency_key` RPC.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../logger.ts";

// deno-lint-ignore no-explicit-any
export async function checkIdempotencyKey(
  supabase: SupabaseClient<any, any, any>,
  key: string,
  operation: string,
): Promise<{ cached: boolean; response?: unknown }> {
  const { data, error } = await supabase.rpc("check_idempotency_key", {
    p_key: key,
    p_operation: operation,
    p_response: null,
  });

  if (error) {
    logger.warn("Idempotency check failed", { error: error.message });
    return { cached: false };
  }

  return data as { cached: boolean; response?: unknown };
}

// deno-lint-ignore no-explicit-any
export async function storeIdempotencyKey(
  supabase: SupabaseClient<any, any, any>,
  key: string,
  operation: string,
  response: unknown,
): Promise<void> {
  const { error } = await supabase.rpc("check_idempotency_key", {
    p_key: key,
    p_operation: operation,
    p_response: response,
  });

  if (error) {
    logger.warn("Idempotency store failed", { error: error.message });
  }
}
