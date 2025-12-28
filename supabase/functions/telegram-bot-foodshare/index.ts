/**
 * Telegram Bot FoodShare - Main Entry Point
 *
 * Enterprise-ready with:
 * - Distributed rate limiting with proper 429 responses
 * - Request correlation IDs for debugging
 * - Structured JSON logging
 * - Enhanced health checks
 * - Automatic state cleanup
 *
 * See README.md for architecture documentation.
 */

import { setWebhook, getTelegramApiStatus } from "./services/telegram-api.ts";
import { handleCallbackQuery } from "./handlers/callbacks.ts";
import {
  handleTextMessage,
  handlePhotoMessage,
  handleLocationMessage,
} from "./handlers/messages.ts";
import { handleResendCode } from "./handlers/auth.ts";
import {
  handleStartCommand,
  handleHelpCommand,
  handleShareCommand,
  handleFindCommand,
  handleNearbyCommand,
  handleProfileCommand,
  handleImpactCommand,
  handleStatsCommand,
  handleLeaderboardCommand,
  handleLanguageCommand,
} from "./handlers/commands.ts";
import { checkRateLimitDistributed } from "./services/rate-limiter.ts";
import { cleanupExpiredStates } from "./services/user-state.ts";
import type { TelegramUpdate } from "./types/index.ts";

const VERSION = "3.2.0";

// ============================================================================
// Initialization Check
// ============================================================================

let isInitialized = false;
let initError: Error | null = null;

try {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("BOT_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!botToken) {
    throw new Error("Missing BOT_TOKEN or TELEGRAM_BOT_TOKEN environment variable");
  }
  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }
  if (!supabaseKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  isInitialized = true;
  console.log(
    JSON.stringify({
      level: "info",
      message: "Telegram bot initialized successfully",
      version: VERSION,
      timestamp: new Date().toISOString(),
    })
  );
} catch (error) {
  initError = error instanceof Error ? error : new Error(String(error));
  console.error(
    JSON.stringify({
      level: "error",
      message: "Initialization failed",
      error: initError.message,
      timestamp: new Date().toISOString(),
    })
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateRequestId(): string {
  return crypto.randomUUID();
}

function log(level: string, message: string, context: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      level,
      message,
      ...context,
      timestamp: new Date().toISOString(),
    })
  );
}

// ============================================================================
// Main Request Handler
// ============================================================================

Deno.serve(async (req) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Check initialization status
  if (!isInitialized) {
    log("error", "Function not initialized", { requestId, error: initError?.message });
    return new Response(
      JSON.stringify({
        error: "Service temporarily unavailable",
        details: initError?.message,
        requestId,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
      }
    );
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Webhook setup endpoint
  if (pathname.endsWith("/setup-webhook")) {
    const webhookUrl = url.searchParams.get("url");
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Missing webhook URL parameter", requestId }), {
        status: 400,
        headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
      });
    }

    const success = await setWebhook(webhookUrl);
    log(success ? "info" : "error", "Webhook setup", { requestId, success, webhookUrl });

    return new Response(
      JSON.stringify({
        success,
        message: success ? "Webhook set successfully" : "Failed to set webhook",
        requestId,
      }),
      {
        status: success ? 200 : 500,
        headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
      }
    );
  }

  // Enhanced health check endpoint
  if (pathname === "/health" || pathname.endsWith("/health") || req.method === "GET") {
    // Optionally cleanup expired states on health check
    let cleanedStates = 0;
    try {
      cleanedStates = await cleanupExpiredStates();
    } catch {
      // Ignore cleanup errors in health check
    }

    const telegramStatus = getTelegramApiStatus();
    const overallStatus = telegramStatus.status === "OPEN" ? "degraded" : "healthy";

    return new Response(
      JSON.stringify({
        status: overallStatus,
        service: "telegram-bot-foodshare",
        version: VERSION,
        timestamp: new Date().toISOString(),
        requestId,
        dependencies: {
          telegram: {
            status: telegramStatus.status,
            failures: telegramStatus.failures,
          },
        },
        maintenance: {
          expiredStatesCleaned: cleanedStates,
        },
      }),
      {
        headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
        status: overallStatus === "healthy" ? 200 : 503,
      }
    );
  }

  // Handle Telegram webhook updates
  if (req.method === "POST") {
    let update: TelegramUpdate | undefined;

    try {
      update = await req.json();
      const userId = update.message?.from?.id || update.callback_query?.from?.id;

      // Distributed rate limiting with proper 429 response
      if (userId) {
        const rateLimit = await checkRateLimitDistributed(userId);

        if (!rateLimit.allowed) {
          log("warn", "Rate limit exceeded", {
            requestId,
            userId,
            retryAfter: rateLimit.retryAfterSeconds,
          });

          return new Response(
            JSON.stringify({
              ok: false,
              error: "Rate limit exceeded",
              retryAfter: rateLimit.retryAfterSeconds,
              requestId,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "X-Request-ID": requestId,
                "Retry-After": String(rateLimit.retryAfterSeconds || 60),
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": rateLimit.resetAt.toISOString(),
              },
            }
          );
        }
      }

      // Handle callback queries (inline button clicks)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        log("info", "Callback query handled", {
          requestId,
          userId,
          action: update.callback_query.data,
          durationMs: Date.now() - startTime,
        });
        return new Response(JSON.stringify({ ok: true, requestId }), {
          headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
        });
      }

      // Handle messages
      if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const msgUserId = message.from?.id;
        const text = message.text?.trim();

        // Handle commands
        if (text?.startsWith("/")) {
          const [command, ...args] = text.split(" ");
          const commandArg = args.join(" ");

          switch (command) {
            case "/start":
              if (msgUserId && message.from) {
                await handleStartCommand(
                  chatId,
                  msgUserId,
                  message.from,
                  message.from.language_code
                );
              }
              break;

            case "/help":
              await handleHelpCommand(chatId, message.from?.language_code);
              break;

            case "/share":
              if (msgUserId && message.from) {
                await handleShareCommand(
                  chatId,
                  msgUserId,
                  message.from,
                  message.from.language_code
                );
              }
              break;

            case "/find":
              await handleFindCommand(chatId, commandArg, message.from?.language_code);
              break;

            case "/nearby":
              if (msgUserId) {
                await handleNearbyCommand(chatId, msgUserId);
              }
              break;

            case "/profile":
              if (msgUserId) {
                await handleProfileCommand(chatId, msgUserId);
              }
              break;

            case "/impact":
              if (msgUserId) {
                await handleImpactCommand(chatId, msgUserId);
              }
              break;

            case "/stats":
              if (msgUserId) {
                await handleStatsCommand(chatId, msgUserId, message.from?.language_code);
              }
              break;

            case "/leaderboard":
              await handleLeaderboardCommand(chatId, message.from?.language_code);
              break;

            case "/language":
            case "/lang":
              if (msgUserId) {
                await handleLanguageCommand(chatId, msgUserId);
              }
              break;

            case "/resend":
              if (message.from) {
                await handleResendCode(message.from, chatId);
              }
              break;

            case "/cancel":
              await handleTextMessage(message);
              break;

            default:
              // Unknown command - ignore
              break;
          }

          log("info", "Command handled", {
            requestId,
            userId: msgUserId,
            command,
            durationMs: Date.now() - startTime,
          });
        }
        // Handle location messages
        else if (message.location) {
          await handleLocationMessage(message);
          log("info", "Location message handled", {
            requestId,
            userId: msgUserId,
            durationMs: Date.now() - startTime,
          });
        }
        // Handle photo messages
        else if (message.photo) {
          await handlePhotoMessage(message);
          log("info", "Photo message handled", {
            requestId,
            userId: msgUserId,
            durationMs: Date.now() - startTime,
          });
        }
        // Handle text messages
        else if (text) {
          await handleTextMessage(message);
          log("info", "Text message handled", {
            requestId,
            userId: msgUserId,
            durationMs: Date.now() - startTime,
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, requestId }), {
        headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      log("error", "Error processing update", {
        requestId,
        error: errorMessage,
        stack: errorStack,
        updatePreview: update ? JSON.stringify(update).substring(0, 300) : "parse_failed",
        durationMs: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          ok: false,
          error: errorMessage,
          requestId,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
        }
      );
    }
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: "Method not allowed", requestId }), {
    status: 405,
    headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
  });
});
