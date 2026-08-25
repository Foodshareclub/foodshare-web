/**
 * Telegram Channel Adapter
 *
 * Delivers direct notifications to users via Telegram Bot.
 * Supports rich HTML formatting, inline action buttons, photo messages,
 * circuit breaker protection, and retry mechanisms.
 *
 * @module api-v1-notifications/channels/telegram
 */

import { getTelegramApiStatus, sendMessage, sendPhoto } from "../../../_shared/telegram-client.ts";
import { logger } from "../../../_shared/logger.ts";
import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  NotificationContext,
  TelegramPayload,
} from "../types.ts";

export class TelegramChannelAdapter implements ChannelAdapter {
  name = "telegram";
  channel = "telegram" as const;

  /**
   * Send notification via Telegram Bot to user
   */
  async send(
    payload: TelegramPayload,
    context: NotificationContext
  ): Promise<ChannelDeliveryResult> {
    const startTime = performance.now();
    const userId = payload.userId || context.userId;

    try {
      // 1. Resolve Telegram ID
      let telegramId: string | number | null | undefined = payload.telegramId;

      if (!telegramId && userId) {
        telegramId = await this.getUserTelegramId(userId, context);
      }

      if (!telegramId) {
        logger.info("User does not have a linked Telegram account", {
          requestId: context.requestId,
          userId,
        });

        return {
          channel: "telegram",
          success: false,
          error: "No linked Telegram account found for user",
          attemptedAt: new Date().toISOString(),
        };
      }

      // 2. Format message
      const formattedMessage = this.formatTelegramMessage(payload);

      // 3. Build inline keyboard
      const replyMarkup = this.buildInlineKeyboard(payload);

      logger.info("Sending Telegram notification", {
        requestId: context.requestId,
        userId,
        telegramId,
        title: payload.title,
      });

      let sentSuccess = false;

      // 4. Send photo or text message
      if (payload.imageUrl) {
        sentSuccess = await sendPhoto(telegramId, payload.imageUrl, formattedMessage, {
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        });
      } else {
        const messageId = await sendMessage(telegramId, formattedMessage, {
          parse_mode: "HTML",
          reply_markup: replyMarkup,
          disable_web_page_preview: false,
        });
        sentSuccess = messageId !== null;
      }

      const durationMs = Math.round(performance.now() - startTime);

      if (sentSuccess) {
        logger.info("Telegram notification sent successfully", {
          requestId: context.requestId,
          userId,
          telegramId,
          durationMs,
        });

        return {
          channel: "telegram",
          success: true,
          provider: "telegram-bot",
          deliveredTo: [String(telegramId)],
          attemptedAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
        };
      } else {
        logger.warn("Telegram notification delivery failed", {
          requestId: context.requestId,
          userId,
          telegramId,
          durationMs,
        });

        return {
          channel: "telegram",
          success: false,
          error: "Failed to send message via Telegram Bot API",
          attemptedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      logger.error("Telegram channel unexpected error", error as Error, {
        requestId: context.requestId,
        userId,
      });

      return {
        channel: "telegram",
        success: false,
        error: (error as Error).message,
        attemptedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch user's telegram_id from public.profiles
   */
  private async getUserTelegramId(
    userId: string,
    context: NotificationContext
  ): Promise<number | null> {
    try {
      const { data, error } = await context.supabase
        .from("profiles")
        .select("telegram_id")
        .eq("id", userId)
        .single();

      if (error || !data || !data.telegram_id) {
        return null;
      }

      return Number(data.telegram_id);
    } catch (err) {
      logger.warn("Failed to fetch user telegram_id", {
        userId,
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * Format message in Telegram HTML style
   */
  private formatTelegramMessage(payload: TelegramPayload): string {
    const categoryIcon = this.getCategoryIcon(payload.category);
    const escape = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    let message = `${categoryIcon} <b>${escape(payload.title)}</b>\n\n`;
    message += `${escape(payload.body)}`;

    return message;
  }

  /**
   * Get category emoji icon
   */
  private getCategoryIcon(category?: string): string {
    switch (category) {
      case "posts":
        return "🍎";
      case "chats":
        return "💬";
      case "comments":
        return "💭";
      case "challenges":
        return "🏆";
      case "social":
        return "👥";
      case "system":
        return "🔔";
      case "forum":
        return "📢";
      case "marketing":
        return "✨";
      default:
        return "🌱";
    }
  }

  /**
   * Construct inline keyboard for notification actions
   */
  private buildInlineKeyboard(
    payload: TelegramPayload
  ):
    | { inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>> }
    | undefined {
    if (payload.inlineButtons && payload.inlineButtons.length > 0) {
      return { inline_keyboard: payload.inlineButtons };
    }

    if (payload.actionUrl) {
      const buttonText = payload.actionText || "🔗 View on FoodShare";
      return {
        inline_keyboard: [
          [
            {
              text: buttonText,
              url: payload.actionUrl,
            },
          ],
        ],
      };
    }

    return undefined;
  }

  /**
   * Health check for Telegram Channel
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const status = getTelegramApiStatus();
    return {
      healthy: status.status !== "OPEN",
      error: status.status === "OPEN" ? "Telegram API circuit breaker is OPEN" : undefined,
    };
  }
}
