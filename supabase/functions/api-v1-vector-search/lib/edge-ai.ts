/**
 * Edge AI Session + Provider Secrets
 *
 * Supabase.ai local ONNX detection with lazy session, plus Vault/ENV
 * key accessors for remote providers.
 * Extracted from `api-v1-vector-search/index.ts` — no logic changes.
 */

import { logger } from "../../_shared/logger.ts";
import { getSecretSync } from "../../_shared/vault.ts";

export interface SupabaseAiSession {
  run(
    text: string,
    options?: { mean_pool?: boolean; normalize?: boolean },
  ): Promise<ArrayLike<number>>;
}

export interface SupabaseGlobal {
  Supabase?: {
    ai?: {
      Session: new (model: string) => SupabaseAiSession;
    };
  };
}

export function getZaiKey(): string {
  return getSecretSync("ZAI_API_KEY") || Deno.env.get("ZAI_API_KEY") || "";
}

export function getGroqKey(): string {
  return getSecretSync("GROQ_API_KEY") || Deno.env.get("GROQ_API_KEY") || "";
}

export function getHfKey(): string {
  return (
    getSecretSync("HUGGINGFACE_ACCESS_TOKEN") ||
    Deno.env.get("HUGGINGFACE_ACCESS_TOKEN") ||
    ""
  );
}

export function isSupabaseAiAvailable(): boolean {
  try {
    const globalSupabase = globalThis as unknown as SupabaseGlobal;
    return typeof globalSupabase.Supabase?.ai?.Session !== "undefined";
  } catch {
    return false;
  }
}

// Lazy session instance for local edge runtime
let edgeAiSession: SupabaseAiSession | null = null;

export function getEdgeAiSession(): SupabaseAiSession | null {
  if (!edgeAiSession && isSupabaseAiAvailable()) {
    try {
      const globalSupabase = globalThis as unknown as SupabaseGlobal;
      if (globalSupabase.Supabase?.ai?.Session) {
        edgeAiSession = new globalSupabase.Supabase.ai.Session("gte-small");
      }
    } catch (err) {
      logger.warn("Failed to initialize Supabase.ai edge session", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return edgeAiSession;
}
