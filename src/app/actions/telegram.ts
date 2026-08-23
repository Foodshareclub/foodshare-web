"use server";

/**
 * Telegram Account Linking & Notification Server Actions
 *
 * Provides cryptographically secure 1-click token generation,
 * connection status queries, and account unlinking for Telegram bot integration.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CACHE_TAGS } from "@/lib/data/cache-keys";
import { invalidateTag } from "@/lib/data/cache-invalidation";
import { serverActionError, successVoid, type ServerActionResult } from "@/lib/errors";
import { createActionLogger } from "@/lib/structured-logger";
import { trackEvent } from "@/app/actions/analytics";
import type { TelegramLinkTokenResult, TelegramStatusResult } from "@/types";

export type { TelegramLinkTokenResult, TelegramStatusResult };

/**
 * Get current user's Telegram link status
 */
export async function getTelegramStatus(): Promise<ServerActionResult<TelegramStatusResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return serverActionError("You must be logged in", "UNAUTHORIZED");
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("telegram_id, telegram_username")
      .eq("id", user.id)
      .single();

    if (error) {
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    const isLinked = !!profile?.telegram_id;

    return {
      success: true,
      data: {
        isLinked,
        telegramUsername: profile?.telegram_username || null,
        telegramId: profile?.telegram_id ? Number(profile.telegram_id) : null,
      },
    };
  } catch (err) {
    return serverActionError((err as Error).message, "UNKNOWN_ERROR");
  }
}

/**
 * Generate a 1-click cryptographic Telegram deep link token
 */
export async function generateTelegramLink(): Promise<ServerActionResult<TelegramLinkTokenResult>> {
  const logger = await createActionLogger("generateTelegramLink");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return serverActionError("You must be logged in", "UNAUTHORIZED");
    }

    // Call database RPC to generate secure token
    const { data, error } = await supabase.rpc("create_telegram_link_token", {
      p_ttl_minutes: 10,
    });

    if (error || !data || !data.token) {
      logger.error("Failed to generate Telegram link token", { error: error?.message });
      return serverActionError(error?.message || "Failed to generate link token", "DATABASE_ERROR");
    }

    const botUsername =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      process.env.TELEGRAM_BOT_USERNAME ||
      "foodshare_club_bot";

    const deepLink = `https://t.me/${botUsername}?start=link_${data.token}`;

    logger.info("Generated Telegram link token successfully", {
      userId: user.id,
      expiresAt: data.expires_at,
    });

    await trackEvent("Telegram Link Token Generated", { method: "web_settings" });

    return {
      success: true,
      data: {
        token: data.token,
        deepLink,
        expiresAt: data.expires_at,
        botUsername,
      },
    };
  } catch (err) {
    logger.error("Error generating Telegram link", { error: (err as Error).message });
    return serverActionError((err as Error).message, "UNKNOWN_ERROR");
  }
}

/**
 * Unlink Telegram from current user profile
 */
export async function unlinkTelegram(): Promise<ServerActionResult<void>> {
  const logger = await createActionLogger("unlinkTelegram");

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return serverActionError("You must be logged in", "UNAUTHORIZED");
    }

    const { error } = await supabase.rpc("unlink_telegram_account", {
      p_user_id: user.id,
    });

    if (error) {
      logger.error("Failed to unlink Telegram account", { error: error.message });
      return serverActionError(error.message, "DATABASE_ERROR");
    }

    revalidatePath("/settings/login-and-security");
    revalidatePath("/settings/notifications");
    invalidateTag(CACHE_TAGS.AUTH);
    invalidateTag(CACHE_TAGS.PROFILES);

    logger.info("Telegram account unlinked successfully", { userId: user.id });
    await trackEvent("Telegram Account Unlinked", { method: "web_settings" });

    return successVoid();
  } catch (err) {
    logger.error("Error unlinking Telegram", { error: (err as Error).message });
    return serverActionError((err as Error).message, "UNKNOWN_ERROR");
  }
}
