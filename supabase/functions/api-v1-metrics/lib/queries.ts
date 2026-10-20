/**
 * Metrics DB Queries
 *
 * Windowed error-rate / active-user / request-count probes with safe
 * fallbacks (return 0 rather than failing the scrape).
 * Extracted from `api-v1-metrics/index.ts` — no logic changes.
 */

import type { getSupabaseClient } from "../../_shared/supabase.ts";

type Supabase = ReturnType<typeof getSupabaseClient>;

export async function getErrorRate(
  supabase: Supabase,
  minutes: number,
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_error_rate", {
      p_minutes: minutes,
    });
    if (error) return 0;
    return data || 0;
  } catch {
    return 0;
  }
}

export async function getActiveUsers(
  supabase: Supabase,
  minutes: number,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      // `last_seen_at`, not `last_active_at`: that is the column profiles
      // has. The old name made PostgREST reject the statement, so this
      // active-user count was always zero.
      .gte(
        "last_seen_at",
        new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      );

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export async function getRequestCount(
  supabase: Supabase,
  minutes: number,
): Promise<number> {
  try {
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("api_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    if (error) {
      const { data, error: rpcError } = await supabase.rpc(
        "get_request_count",
        {
          p_minutes: minutes,
        },
      );

      if (rpcError) return 0;
      return data || 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
