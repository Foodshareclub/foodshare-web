/**
 * Telegram Bot FoodShare - Main Entry Point
 *
 * Modular architecture with clean separation of concerns.
 * See README.md for architecture documentation.
 */

import { setWebhook } from "./services/telegram-api.ts";
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
import type { TelegramUpdate } from "./types/index.ts";

// ============================================================================
// Initialization Check
// ============================================================================

let isInitialized = false;
let initError: Error | null = null;

try {
  // Verify critical environment variables (check both naming conventions)
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
  console.log("✅ Telegram bot initialized successfully");
} catch (error) {
  initError = error instanceof Error ? error : new Error(String(error));
  console.error("❌ Initialization failed:", initError);
}

// ============================================================================
// Main Request Handler
// ============================================================================

Deno.serve(async (req) => {
  // Check initialization status
  if (!isInitialized) {
    console.error("Function not initialized:", initError?.message);
    return new Response(
      JSON.stringify({
        error: "Service temporarily unavailable",
        details: initError?.message,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Webhook setup endpoint (must be before general POST handler)
  if (pathname.endsWith("/setup-webhook")) {
    const webhookUrl = url.searchParams.get("url");
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Missing webhook URL parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const success = await setWebhook(webhookUrl);
    return new Response(
      JSON.stringify({
        success,
        message: success ? "Webhook set successfully" : "Failed to set webhook",
      }),
      {
        status: success ? 200 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Health check endpoint
  if (pathname === "/health" || pathname.endsWith("/health") || req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "telegram-bot-foodshare",
        version: "3.0.0",
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  }

  // Handle Telegram webhook updates
  if (req.method === "POST") {
    try {
      const update: TelegramUpdate = await req.json();

      // Rate limiting check
      if (update.message?.from?.id || update.callback_query?.from?.id) {
        const userId = update.message?.from?.id || update.callback_query?.from?.id;
        const { checkRateLimit } = await import("./services/rate-limiter.ts");

        if (!checkRateLimit(userId!)) {
          console.warn(`Rate limit exceeded for user ${userId}`);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      // Handle callback queries (inline button clicks)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle messages
      if (update.message) {
        const message = update.message;
        const chatId = message.chat.id;
        const userId = message.from?.id;
        const text = message.text?.trim();

        // Handle commands
        if (text?.startsWith("/")) {
          const [command, ...args] = text.split(" ");
          const commandArg = args.join(" ");

          switch (command) {
            case "/start":
              if (userId && message.from) {
                await handleStartCommand(chatId, userId, message.from, message.from.language_code);
              }
              break;

            case "/help":
              await handleHelpCommand(chatId, message.from?.language_code);
              break;

            case "/share":
              if (userId && message.from) {
                await handleShareCommand(chatId, userId, message.from, message.from.language_code);
              }
              break;

            case "/find":
              await handleFindCommand(chatId, commandArg, message.from?.language_code);
              break;

            case "/nearby":
              if (userId) {
                await handleNearbyCommand(chatId, userId);
              }
              break;

            case "/profile":
              if (userId) {
                await handleProfileCommand(chatId, userId);
              }
              break;

            case "/impact":
              if (userId) {
                await handleImpactCommand(chatId, userId);
              }
              break;

            case "/stats":
              if (userId) {
                await handleStatsCommand(chatId, userId, message.from?.language_code);
              }
              break;

            case "/leaderboard":
              await handleLeaderboardCommand(chatId, message.from?.language_code);
              break;

            case "/language":
            case "/lang":
              if (userId) {
                await handleLanguageCommand(chatId, userId);
              }
              break;

            case "/resend":
              if (message.from) {
                await handleResendCode(message.from, chatId);
              }
              break;

            case "/cancel":
              // Handled in handleTextMessage
              await handleTextMessage(message);
              break;

            default:
              // Unknown command - ignore or send help
              break;
          }
        }
        // Handle location messages
        else if (message.location) {
          await handleLocationMessage(message);
        }
        // Handle photo messages
        else if (message.photo) {
          await handlePhotoMessage(message);
        }
        // Handle text messages
        else if (text) {
          await handleTextMessage(message);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Log detailed error information
      console.error("Error processing update:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        update: JSON.stringify(update).substring(0, 500), // First 500 chars
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
});
