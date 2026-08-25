/**
 * Telegram Channel & Account Linking Tests
 *
 * Tests for:
 * - api-v1-notifications/lib/channels/telegram.ts
 * - telegram-bot-foodshare/handlers/auth.ts (handleDeepLinkToken, handleUnlinkCommand)
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { TelegramChannelAdapter } from "../api-v1-notifications/lib/channels/telegram.ts";
import { handleDeepLinkToken } from "../telegram-bot-foodshare/handlers/auth.ts";

function createMockContext(telegramId: number | null = 123456789) {
  return {
    supabase: {
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_col: string, _val: string) => ({
            single: async () => ({
              data: telegramId ? { telegram_id: telegramId } : null,
              error: telegramId ? null : { message: "Not found" },
            }),
          }),
        }),
      }),
      rpc: async (fn: string, args: Record<string, unknown>) => {
        if (fn === "claim_telegram_link_token") {
          if (args.p_token === "valid-token-123") {
            return {
              data: {
                success: true,
                user_id: "user-123",
                email: "user@foodshare.club",
                first_name: "Alex",
                telegram_id: args.p_telegram_id,
              },
              error: null,
            };
          }
          return {
            data: { success: false, error: "Invalid or expired link token" },
            error: null,
          };
        }
        return { data: { success: true }, error: null };
      },
    } as any,
    requestId: "test-req-tg",
    userId: "user-123",
  };
}

Deno.test("TelegramChannelAdapter: fails gracefully when no linked telegram_id", async () => {
  const adapter = new TelegramChannelAdapter();
  const context = createMockContext(null);

  const result = await adapter.send(
    {
      userId: "user-no-tg",
      title: "New Food Item",
      body: "Apples available nearby",
    },
    context,
  );

  assertEquals(result.success, false);
  assertEquals(result.channel, "telegram");
  assertEquals(result.error, "No linked Telegram account found for user");
});

Deno.test(
  "TelegramChannelAdapter: sends formatted message when telegram_id is present",
  async () => {
    const adapter = new TelegramChannelAdapter();
    const context = createMockContext(987654321);

    // Set mock bot token
    Deno.env.set("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11");

    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.includes("/sendMessage")) {
          const body = JSON.parse(String((init as { body?: unknown })?.body || "{}"));
          assertEquals(body.chat_id, 987654321);
          assertEquals(body.parse_mode, "HTML");
          return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: false }), { status: 404 });
      };

      const result = await adapter.send(
        {
          userId: "user-123",
          title: "Apple Box Claimed",
          body: "Someone requested your organic apples!",
          actionUrl: "https://foodshare.club/food/123",
          actionText: "View Request",
          category: "posts",
        },
        context,
      );

      assertEquals(result.success, true);
      assertEquals(result.channel, "telegram");
      assertEquals(result.deliveredTo, ["987654321"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
);

Deno.test("handleDeepLinkToken: rejects empty token", async () => {
  const result = await handleDeepLinkToken(
    "",
    { id: 123456, first_name: "Test", is_bot: false },
    123456,
  );
  assertEquals(result, false);
});
