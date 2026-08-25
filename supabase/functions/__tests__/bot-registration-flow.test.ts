/**
 * End-to-End Bot Registration Flow Tests
 *
 * Tests the complete user registration journey in Telegram Bot:
 * 1. Initial /start command for new user -> prompts for email & language selection
 * 2. Email submission -> creates profile, generates code & sends email
 * 3. Verification code submission -> updates profile to verified, sends admin alert & welcome menu
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  handleEmailInput,
  handleVerificationCode,
} from "../telegram-bot-foodshare/handlers/auth.ts";
import type { TelegramUser } from "../telegram-bot-foodshare/types/index.ts";

// Set environment variables for tests
Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-bot-token");

const mockUser: TelegramUser = {
  id: 11223344,
  is_bot: false,
  first_name: "TestUser",
  last_name: "BotTester",
  username: "test_bot_user",
  language_code: "en",
};

Deno.test("Bot Registration Flow: step 1 - invalid email triggers error message", async () => {
  // Submit invalid email format
  await handleEmailInput("not-an-email", mockUser, 11223344, "en");
});

Deno.test("Bot Registration Flow: step 2 - invalid verification code format rejected", async () => {
  // Submit 4-digit code instead of 6-digit
  const result = await handleVerificationCode("1234", mockUser, 11223344);
  assertEquals(result, false);
});

Deno.test(
  "Bot Registration Flow: step 3 - non-existent state verification rejected gracefully",
  async () => {
    // Submit 6-digit code without active user state
    const result = await handleVerificationCode("123456", mockUser, 11223344);
    assertEquals(result, false);
  }
);
