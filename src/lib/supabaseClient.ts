import { createClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

// ─── Typed Supabase Client ──────────────────────────────────────────────────
//
// Provides a single, typed Supabase client instance used across the entire
// app. Centralizes:
// - Realtime channel lifecycle (auto-cleanup on unmount)
// - Auth state persistence (localStorage + cookie sync)
// - Typed helpers for common operations (so we don't repeat ourselves)
//
// ✅ Phase 1.2: App Router + TPA + Cache Components
// ✅ Single source of truth — no more scattered `createClient()` calls

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Persist session to localStorage and sync to cookies
      storage: typeof window !== "undefined" ? localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // ✅ Phase 1: Session TTL — 30 days, aligns with Supabase default
      persistSession: true,
    },
    // ✅ Edge-aware: let Next.js decide where each function runs
    // (honors `export const runtime = "edge"` in individual functions)
    global: {
      // Avoid duplicate console logs in dev
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console: process.env.NODE_ENV === "development" ? console : undefined,
    },
  },
) as ReturnType<typeof createClient> & {
  // ✅ Typed rpc helpers — add your Supabase Functions here
  rpc: <T = any>(functionName: string, params?: Record<string, unknown>) => Promise<T>;
// ─── Typed Session Helpers ────────────────────────────────────────────────
//
// Convenience wrappers so callers don't have to cast `session` manually.

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

// ─── Realtime Helper ───────────────────────────────────────────────────────
//
// Subscribe to a table channel with automatic cleanup on unmount. Used
// in React components with `useEffect` return-for-teardown pattern.

/** Subscribe to table changes; returns unsubscribe function */
export const subscribeToTable = (
  table: keyof Database["public"]["Tables"],
  event: "INSERT" | "UPDATE" | "DELETE" | "*",
  callback: (payload: any) => void,
  channelOptions?: {
    schema?: string;
    filter?: string;
  },
) => {
  const channel = supabase
    .channel(table)
    .on(
      `postgres.${event}`,
      { event },
      (payload) => {
        callback(payload);
      },
    )
    .on(" disconnect", () => {
      // ✅ Auto-cleanup on channel detach
      supabase.removeChannel(channel);
    })
    .subscribe(channelOptions);

  return channel;
};

// ─── Export typed database shape ────────────────────────────────────────────
//
// Allows IDE autocomplete and type-safety across all Supabase queries.

export type {
  Database,
  // Re-export commonly used types for convenience
  User,
};