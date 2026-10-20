/**
 * Telegram Delivery for Alert Webhooks
 *
 * Shared HTML-message sender used by the Sentry and Xcode Cloud webhooks.
 * Extracted from `api-v1-alerts/index.ts` — the sender was previously named
 * `sendSentryToTelegram`; it is now `sendTelegramMessage` (kept aliased for
 * compat) since both webhooks share it.
 */

import { logger } from "../../_shared/logger.ts";

export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(
    />/g,
    "&gt;",
  );
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("BOT_TOKEN");
  const chatId = Deno.env.get("ADMIN_CHAT_ID");

  if (!botToken || !chatId) {
    logger.warn(
      "Alert webhook: TELEGRAM_BOT_TOKEN (or BOT_TOKEN) or ADMIN_CHAT_ID not configured",
    );
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    return response.ok;
  } catch (error) {
    logger.error("Failed to send alert to Telegram", error as Error);
    return false;
  }
}

/** Backward-compat alias (was Sentry-specific, now shared). */
export const sendSentryToTelegram = sendTelegramMessage;
