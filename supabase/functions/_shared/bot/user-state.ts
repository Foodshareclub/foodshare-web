/**
 * Shared Bot User State Factory
 *
 * Generic user state management with TTL support for bot services.
 * Eliminates duplication between Telegram and WhatsApp bots.
 *
 * Usage:
 * ```ts
 * const stateService = createBotUserStateService<TelegramUserState>({
 *   tableName: "telegram_user_states",
 *   idColumn: "user_id",
 * });
 * const state = await stateService.get(userId);
 * ```
 */

import { logger } from "../logger.ts";
import { getSupabaseClient } from "../supabase.ts";
import type { Json } from "../database.types.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * The complete set of tables this state service manages. A closed set on
 * purpose: each query names a literal table and column the compiler checks
 * against the real schema, so a new bot is one more literal plus a branch —
 * not a string the type system cannot see.
 */
export type BotUserStateTable = "telegram_user_states" | "whatsapp_user_states";

export interface BotUserStateConfig {
  /** Which of the known state tables to use: see BotUserStateTable. */
  tableName: BotUserStateTable;
  /** TTL config by action name (in minutes) */
  ttlConfig?: Record<string, number>;
  /** Default TTL in minutes */
  defaultTTL?: number;
}

// =============================================================================
// Default TTL Config
// =============================================================================

const DEFAULT_STATE_TTL: Record<string, number> = {
  default: 30,
  awaiting_email: 15,
  awaiting_verification: 15,
  awaiting_verification_link: 15,
  sharing_food: 60,
  setting_radius: 10,
  updating_profile_location: 10,
};

// =============================================================================
// Factory
// =============================================================================

export function createBotUserStateService<TState extends { action?: string }>(
  config: BotUserStateConfig,
) {
  const {
    tableName,
    ttlConfig = DEFAULT_STATE_TTL,
    defaultTTL = 30,
  } = config;

  // Closed set: `BotUserStateTable` is a union of two literals, so each
  // query below is a literal the compiler checks against the schema.
  const isTelegram = tableName === "telegram_user_states";

  function getTTLMinutes(action?: string): number {
    if (!action) return defaultTTL;
    return ttlConfig[action] ?? defaultTTL;
  }

  /**
   * Get user state with automatic expiration check
   */
  async function get(id: string | number): Promise<TState | null> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = isTelegram
        ? await supabase
          .from("telegram_user_states")
          .select("state,expires_at")
          .eq("user_id", id)
          .single()
        : await supabase
          .from("whatsapp_user_states")
          .select("state,expires_at")
          .eq("phone_number", String(id))
          .single();

      if (error || !data) return null;

      // Check if state has expired
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          logger.info("Bot state expired, cleaning up", {
            table: tableName,
            id: String(id).substring(0, 8),
          });
          await remove(id);
          return null;
        }
      }

      return data.state as TState;
    } catch (error) {
      logger.error("Error getting bot user state", {
        table: tableName,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Set user state with automatic TTL
   */
  async function set(id: string | number, state: TState | null): Promise<void> {
    const supabase = getSupabaseClient();

    try {
      if (state === null) {
        await remove(id);
      } else {
        const ttlMinutes = getTTLMinutes(state.action);
        const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        // `state` crosses into a jsonb column: the Json type is the
        // boundary, and the generic is trusted to be JSON-serialisable.
        const payload = {
          state: state as Json,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        };
        if (isTelegram) {
          await supabase.from("telegram_user_states").upsert({
            user_id: Number(id),
            ...payload,
          });
        } else {
          await supabase.from("whatsapp_user_states").upsert({
            phone_number: String(id),
            ...payload,
          });
        }
      }
    } catch (error) {
      logger.error("Error setting bot user state", {
        table: tableName,
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Delete user state
   */
  async function remove(id: string | number): Promise<void> {
    const supabase = getSupabaseClient();
    try {
      if (isTelegram) {
        await supabase.from("telegram_user_states").delete().eq("user_id", id);
      } else {
        await supabase
          .from("whatsapp_user_states")
          .delete()
          .eq("phone_number", String(id));
      }
    } catch (error) {
      logger.error("Error deleting bot user state", {
        table: tableName,
        error: String(error),
      });
    }
  }

  /**
   * Clean up all expired states
   */
  async function cleanup(): Promise<number> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = isTelegram
        ? await supabase
          .from("telegram_user_states")
          .delete()
          .lt("expires_at", new Date().toISOString())
          .select("user_id")
        : await supabase
          .from("whatsapp_user_states")
          .delete()
          .lt("expires_at", new Date().toISOString())
          .select("phone_number");

      if (error) {
        logger.error("Error cleaning up expired bot states", {
          table: tableName,
          error: String(error),
        });
        return 0;
      }

      const count = data?.length || 0;
      if (count > 0) {
        logger.info("Cleaned up expired bot user states", {
          table: tableName,
          count,
        });
      }
      return count;
    } catch (error) {
      logger.error("Error in bot state cleanup", {
        table: tableName,
        error: String(error),
      });
      return 0;
    }
  }

  return { get, set, remove, cleanup };
}
