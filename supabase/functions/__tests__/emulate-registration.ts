/**
 * Registration & Verification Emulation Script
 *
 * Intercepts Telegram API requests and prints the exact rendered HTML
 * notifications that are delivered to admins for registration and verification events.
 */

import {
  handleTriggerNewUser,
  handleTriggerUserVerified,
} from "../api-v1-notifications/lib/handlers/triggers.ts";
import type { NotificationContext } from "../api-v1-notifications/lib/types.ts";

// Set dummy bot token so telegram-client doesn't throw on missing env var
Deno.env.set("TELEGRAM_BOT_TOKEN", "123456789:ABCdefGHIjklMNOpqrsTUVwxyz");
Deno.env.set("ADMIN_CHAT_ID", "-1001234567890");

// Intercept fetch calls to api.telegram.org and log formatted Telegram messages
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (urlStr.includes("api.telegram.org") && init?.body) {
    try {
      const payload = JSON.parse(init.body as string);
      console.log("\n📲 [TELEGRAM API INTERCEPTED PAYLOAD]");
      console.log(`Chat ID: ${payload.chat_id}`);
      console.log("Parse Mode:", payload.parse_mode || "HTML");
      console.log("\n--- MESSAGE CONTENT BEGIN ---");
      console.log(payload.text);
      console.log("--- MESSAGE CONTENT END ---\n");
      return new Response(
        JSON.stringify({ ok: true, result: { message_id: 999 } }),
        {
          status: 200,
        },
      );
    } catch {
      // Fallback if body parsing fails
    }
  }
  return originalFetch(input, init);
};

const mockContext: NotificationContext = {
  requestId: "emu-req-100",
  supabase: {} as any,
};

console.log(
  "===============================================================================",
);
console.log(
  "             EMULATING FOODSHARE USER REGISTRATION & VERIFICATION             ",
);
console.log(
  "===============================================================================\n",
);

// Scenario 1: New Registration from Web / Mobile App
console.log("👉 SCENARIO 1: User Registration via Web / Mobile App");
const webUserPayload = {
  record: {
    id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    first_name: "Sarah",
    second_name: "Connor",
    email: "sarah.connor@foodshare.club",
    email_verified: false,
    created_time: "2026-07-24T08:30:00.000Z",
    onboarding_completed: false,
  },
};
await handleTriggerNewUser(webUserPayload, mockContext);

console.log(
  "-------------------------------------------------------------------------------",
);

// Scenario 2: New Registration from Telegram Bot
console.log("👉 SCENARIO 2: User Registration via Telegram Bot");
const tgUserPayload = {
  record: {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    first_name: "Alex",
    nickname: "alex_eco",
    telegram_id: 987654321,
    email: "alex.eco@foodshare.club",
    email_verified: false,
    created_time: "2026-07-24T08:30:15.000Z",
    onboarding_completed: false,
  },
};
await handleTriggerNewUser(tgUserPayload, mockContext);

console.log(
  "-------------------------------------------------------------------------------",
);

// Scenario 3: Email Verification Completed
console.log("👉 SCENARIO 3: User Email Verification Confirmed");
const verifiedUserPayload = {
  record: {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    first_name: "Alex",
    nickname: "alex_eco",
    telegram_id: 987654321,
    email: "alex.eco@foodshare.club",
    email_verified: true,
  },
};
await handleTriggerUserVerified(verifiedUserPayload, mockContext);

console.log(
  "===============================================================================",
);
console.log(
  "                          EMULATION COMPLETE                                   ",
);
console.log(
  "===============================================================================",
);
