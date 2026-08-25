/**
 * Telegram API client with circuit breaker protection and timeouts
 * Shared across the backend (bots, notifications, alerting)
 */

import { logger } from "./logger.ts";
import { CircuitBreakerError, getCircuitStatus, withCircuitBreaker } from "./circuit-breaker.ts";
import { getAdminClient } from "./supabase.ts";

const CIRCUIT_CONFIG = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
};

const FETCH_TIMEOUT = 10000; // 10 seconds

// When true, all sent messages are auto-scheduled for deletion after 5 min.
// Set via enableGroupAutoDelete / disableGroupAutoDelete around group message handling.
let _groupAutoDelete = false;

export function enableGroupAutoDelete(_chatId?: number): void {
  _groupAutoDelete = true;
}

export function disableGroupAutoDelete(): void {
  _groupAutoDelete = false;
}

let _telegramBotToken: string | undefined;

/**
 * Set the bot token explicitly (useful when loading from Vault)
 */
export function setTelegramBotToken(token: string): void {
  _telegramBotToken = token.trim();
}

/**
 * Lazily resolve Telegram API URL to allow loading without env vars
 * but throw when actually used.
 */
function getTelegramApiUrl(): string {
  let token = _telegramBotToken || Deno.env.get("TELEGRAM_BOT_TOKEN") ||
    Deno.env.get("BOT_TOKEN");
  token = token?.trim();
  if (!token) {
    throw new Error(
      "Missing TELEGRAM_BOT_TOKEN or BOT_TOKEN environment variable",
    );
  }
  if (token.toLowerCase().startsWith("bot")) {
    token = token.substring(3);
  }
  return `https://api.telegram.org/bot${token}`;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get Telegram API health status
 */
export function getTelegramApiStatus(): { status: string; failures: number } {
  const status = getCircuitStatus("telegram-api");
  return {
    status: status?.state || "CLOSED",
    failures: status?.failures || 0,
  };
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  options: Record<string, unknown> = {},
): Promise<number | null> {
  try {
    return await withCircuitBreaker(
      "telegram-api",
      async () => {
        const response = await fetchWithTimeout(
          `${getTelegramApiUrl()}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: options.parse_mode || "HTML",
              ...options,
            }),
          },
        );

        const result = await response.json();

        if (!result.ok) {
          logger.error("Telegram API error", { result });
          // Throw for circuit breaker to count failure
          if (response.status >= 500) {
            throw new Error(`Telegram API error: ${result.description}`);
          }
          return null;
        }

        const messageId = result.result?.message_id ?? null;

        // Auto-delete in group chats
        if (messageId && _groupAutoDelete && typeof chatId === "number") {
          scheduleGroupMessageDeletion(chatId, messageId);
        }

        return messageId;
      },
      CIRCUIT_CONFIG,
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Telegram API circuit breaker open, message not sent");
      return null;
    }
    logger.error("Send message error", { error: String(error) });
    return null;
  }
}

export async function sendPhoto(
  chatId: number | string,
  photo: string,
  caption?: string,
  options: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    return await withCircuitBreaker(
      "telegram-api",
      async () => {
        const response = await fetchWithTimeout(
          `${getTelegramApiUrl()}/sendPhoto`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo,
              caption: caption && caption.length > 1024
                ? caption.substring(0, 1021) + "..."
                : caption,
              parse_mode: "HTML",
              ...options,
            }),
          },
        );

        const result = await response.json();

        if (!result.ok && response.status >= 500) {
          throw new Error(`Telegram API error: ${result.description}`);
        }

        return result.ok === true;
      },
      CIRCUIT_CONFIG,
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Telegram API circuit breaker open, photo not sent");
      return false;
    }
    logger.error("Send photo error", { error: String(error) });
    return false;
  }
}

export async function sendLocation(
  chatId: number | string,
  latitude: number,
  longitude: number,
): Promise<boolean> {
  try {
    return await withCircuitBreaker(
      "telegram-api",
      async () => {
        const response = await fetchWithTimeout(
          `${getTelegramApiUrl()}/sendLocation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              latitude,
              longitude,
            }),
          },
        );

        const result = await response.json();

        if (!result.ok && response.status >= 500) {
          throw new Error(`Telegram API error: ${result.description}`);
        }

        return result.ok === true;
      },
      CIRCUIT_CONFIG,
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Telegram API circuit breaker open, location not sent");
      return false;
    }
    logger.error("Send location error", { error: String(error) });
    return false;
  }
}

export async function setWebhook(
  url: string,
  webhookSecret?: string,
): Promise<{ ok: boolean; description?: string; result?: unknown }> {
  try {
    const webhookConfig: Record<string, unknown> = {
      url,
      allowed_updates: ["message", "callback_query"],
    };

    // Add secret_token if configured
    if (webhookSecret) {
      webhookConfig.secret_token = webhookSecret.trim();
    }

    const response = await fetch(`${getTelegramApiUrl()}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookConfig),
    });

    const result = await response.json();

    if (result.ok) {
      logger.info("Webhook configured successfully", {
        hasSecretToken: !!webhookSecret,
      });
    } else {
      logger.error("Failed to configure webhook", {
        error: result.description,
      });
    }

    return result;
  } catch (error) {
    logger.error("Set webhook error", { error: String(error) });
    return { ok: false, description: String(error) };
  }
}

export async function deleteMessage(
  chatId: number | string,
  messageId: number,
): Promise<boolean> {
  try {
    return await withCircuitBreaker(
      "telegram-api",
      async () => {
        const response = await fetchWithTimeout(
          `${getTelegramApiUrl()}/deleteMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
            }),
          },
        );

        const result = await response.json();

        if (!result.ok && response.status >= 500) {
          throw new Error(`Telegram API error: ${result.description}`);
        }

        return result.ok === true;
      },
      CIRCUIT_CONFIG,
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Telegram API circuit breaker open, message not deleted");
      return false;
    }
    logger.error("Delete message error", {
      error: String(error),
      chatId,
      messageId,
    });
    return false;
  }
}

/**
 * Schedule a bot message for auto-deletion in group chats after 5 minutes.
 *
 * TODO: Implementing this via setTimeout is an anti-pattern in Edge Functions
 * because isolates are suspended when idle, meaning the timeout may never fire.
 * This needs to be moved to a database table (e.g., `group_message_deletions`)
 * and processed via a pg_cron job that calls a webhook or `pg_net`.
 */
export function scheduleGroupMessageDeletion(
  chatId: number,
  messageId: number,
): void {
  const supabase = getAdminClient();
  // Delete in 5 minutes
  const deleteAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  supabase
    .from("group_message_deletions")
    .insert({ chat_id: chatId, message_id: messageId, delete_at: deleteAt })
    .then(({ error }) => {
      if (error) {
        logger.error("Failed to schedule group message deletion", {
          error: String(error),
          chatId,
          messageId,
        });
      }
    });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<boolean> {
  try {
    return await withCircuitBreaker(
      "telegram-api",
      async () => {
        const response = await fetchWithTimeout(
          `${getTelegramApiUrl()}/answerCallbackQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: callbackQueryId,
              text,
            }),
          },
        );

        const result = await response.json();

        if (!result.ok && response.status >= 500) {
          throw new Error(`Telegram API error: ${result.description}`);
        }

        return result.ok === true;
      },
      CIRCUIT_CONFIG,
    );
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      logger.warn("Telegram API circuit breaker open, callback not answered");
      return false;
    }
    logger.error("Answer callback query error", { error: String(error) });
    return false;
  }
}
