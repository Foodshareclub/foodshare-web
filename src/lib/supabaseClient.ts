/**
 * @deprecated Import from `@/lib/supabase/client` (browser) or
 * `@/lib/supabase/server` (RSC / Server Actions) instead.
 *
 * This module is kept as a thin backwards-compatibility shim so existing
 * imports keep working. It re-exports the canonical browser singleton and
 * typed helpers — there is exactly one client implementation.
 */

import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { createClient, supabase } from "@/lib/supabase/client";

export { supabase, createClient };

/** Current authenticated user (or null if not signed in) */
export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

/** Signed-in status — reactive-friendly */
export const isSignedIn = async (): Promise<boolean> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
};

/** Sign out everywhere (revokes all refresh tokens) */
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut({ scope: "global" });
};

/**
 * Subscribe to Postgres changes on a table; returns an unsubscribe function.
 * Uses the `postgres_changes` event API with automatic channel cleanup.
 */
export const subscribeToTable = (
  table: keyof Database["public"]["Tables"],
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: unknown) => void,
  channelOptions?: {
    schema?: string;
    filter?: string;
  }
) => {
  // Use the fully-typed client (not the lazy Proxy) so channel overloads resolve.
  const client = createClient();
  const channel = client
    .channel(`table:${String(table)}`)
    .on(
      "postgres_changes",
      { event, schema: "public", table: String(table), ...channelOptions },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
};

export type { Database, User };
