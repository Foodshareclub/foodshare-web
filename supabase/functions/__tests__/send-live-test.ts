/**
 * Live Telegram Notification Dispatcher
 *
 * Reads real TELEGRAM_BOT_TOKEN and ADMIN_CHAT_ID from environment variables
 * and sends live registration & verification alert messages directly to Telegram.
 */

import {
  handleTriggerNewUser,
  handleTriggerUserVerified,
} from "../api-v1-notifications/lib/handlers/triggers.ts";
import type { NotificationContext } from "../api-v1-notifications/lib/types.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const chatId = Deno.env.get("ADMIN_CHAT_ID");

if (!botToken || !chatId) {
  console.error(
    "❌ ERROR: TELEGRAM_BOT_TOKEN or ADMIN_CHAT_ID is missing from environment.",
  );
  console.log("\nUsage:");
  console.log(
    "  TELEGRAM_BOT_TOKEN='<your_token>' ADMIN_CHAT_ID='<your_chat_id>' deno run --allow-all supabase/functions/__tests__/send-live-test.ts\n",
  );
  Deno.exit(1);
}

const mockContext: NotificationContext = {
  requestId: "live-test-req-1",
  supabase: {} as any,
};

console.log(
  `🚀 Dispatching live registration alert to Telegram Chat ID: ${chatId}...`,
);

// 1. Send Registration Notification
const registrationPayload = {
  record: {
    id: crypto.randomUUID(),
    first_name: "Test",
    second_name: "User",
    nickname: "test_live_user",
    email: "live_test@foodshare.club",
    email_verified: false,
    created_time: new Date().toISOString(),
  },
};

const regResult = await handleTriggerNewUser(registrationPayload, mockContext);
console.log(
  `Result: ${
    regResult.success
      ? "✅ Message Delivered to Telegram!"
      : "❌ Delivery Failed: " + regResult.error
  }`,
);

// 2. Send Verification Notification
console.log(
  `🚀 Dispatching live email verification alert to Telegram Chat ID: ${chatId}...`,
);

const verificationPayload = {
  record: {
    id: registrationPayload.record.id,
    first_name: "Test",
    second_name: "User",
    nickname: "test_live_user",
    email: "live_test@foodshare.club",
    email_verified: true,
  },
};

const verResult = await handleTriggerUserVerified(
  verificationPayload,
  mockContext,
);
console.log(
  `Result: ${
    verResult.success
      ? "✅ Message Delivered to Telegram!"
      : "❌ Delivery Failed: " + verResult.error
  }`,
);
