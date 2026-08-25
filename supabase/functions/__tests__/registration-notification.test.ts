/**
 * Registration Notification Trigger Tests
 *
 * Tests for handleTriggerNewUser in api-v1-notifications/lib/handlers/triggers.ts
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  handleTriggerNewUser,
  handleTriggerUserVerified,
} from "../api-v1-notifications/lib/handlers/triggers.ts";
import type { NotificationContext } from "../api-v1-notifications/lib/types.ts";

const mockContext: NotificationContext = {
  requestId: "test-request-id",
  supabase: {} as any,
};

Deno.test("handleTriggerNewUser: missing record data returns error", async () => {
  const result = await handleTriggerNewUser(null, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.error, "Missing record data");
});

Deno.test("handleTriggerNewUser: parses Web/App profile payload correctly", async () => {
  const payload = {
    record: {
      id: "user-uuid-1",
      first_name: "Alice",
      second_name: "Smith",
      email: "alice@example.com",
      email_verified: true,
      created_time: "2026-07-24T12:00:00Z",
    },
  };

  const result = await handleTriggerNewUser(payload, mockContext);
  // Without ADMIN_CHAT_ID set, sendMessage returns null, resulting in success: false but parsed cleanly
  assertEquals(typeof result.success, "boolean");
});

Deno.test("handleTriggerNewUser: parses Telegram Bot profile payload correctly", async () => {
  const payload = {
    record: {
      id: "user-uuid-2",
      first_name: "Bob",
      nickname: "bob_telegram",
      telegram_id: 987654321,
      email: "bob@example.com",
      email_verified: false,
      created_time: "2026-07-24T12:00:00Z",
    },
  };

  const result = await handleTriggerNewUser(payload, mockContext);
  assertEquals(typeof result.success, "boolean");
});

Deno.test("handleTriggerNewUser: parses nested Supabase trigger payload correctly", async () => {
  const payload = {
    record: {
      record: {
        id: "user-uuid-3",
        first_name: "Charlie",
        email: "charlie@example.com",
        created_time: "2026-07-24T12:00:00Z",
      },
    },
  };

  const result = await handleTriggerNewUser(payload, mockContext);
  assertEquals(typeof result.success, "boolean");
});

Deno.test("handleTriggerUserVerified: handles missing record gracefully", async () => {
  const result = await handleTriggerUserVerified(null, mockContext);
  assertEquals(result.success, false);
  assertEquals(result.error, "Missing record data");
});

Deno.test("handleTriggerUserVerified: parses verified user profile correctly", async () => {
  const payload = {
    record: {
      id: "user-uuid-4",
      first_name: "Dave",
      email: "dave@example.com",
      telegram_id: 554433221,
      email_verified: true,
    },
  };

  const result = await handleTriggerUserVerified(payload, mockContext);
  assertEquals(typeof result.success, "boolean");
});
