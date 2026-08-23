/**
 * Telegram Server Actions Tests
 * Unit tests for Telegram link token generation, status, and unlinking
 */

import { mock, describe, it, expect, beforeEach } from "bun:test";
import { getTelegramStatus, generateTelegramLink, unlinkTelegram } from "@/app/actions/telegram";

const mockState = {
  user: null as { id: string; email: string } | null,
  profile: null as { telegram_id: number | null; telegram_username: string | null } | null,
  rpcResult: null as any,
  rpcError: null as any,
  authError: null as any,
  dbError: null as any,
};

mock.module("next/cache", () => ({
  revalidatePath: mock(() => {}),
  revalidateTag: mock(() => {}),
}));

mock.module("@/lib/data/cache-invalidation", () => ({
  invalidateTag: mock(() => {}),
}));

mock.module("@/app/actions/analytics", () => ({
  trackEvent: mock(async () => {}),
}));

mock.module("@/lib/supabase/server", () => ({
  createClient: mock(async () => ({
    auth: {
      getUser: mock(async () => ({
        data: { user: mockState.user },
        error: mockState.authError,
      })),
    },
    from: mock(() => ({
      select: mock(() => ({
        eq: mock(() => ({
          single: mock(async () => ({
            data: mockState.profile,
            error: mockState.dbError,
          })),
        })),
      })),
    })),
    rpc: mock(async (fn: string) => {
      if (mockState.rpcError) {
        return { data: null, error: mockState.rpcError };
      }
      if (fn === "create_telegram_link_token") {
        return {
          data: {
            token: "test_token_abc123",
            expires_at: new Date(Date.now() + 600000).toISOString(),
            ttl_minutes: 10,
          },
          error: null,
        };
      }
      return { data: { success: true }, error: null };
    }),
  })),
}));

describe("Telegram Server Actions", () => {
  beforeEach(() => {
    mockState.user = { id: "user-123", email: "user@foodshare.club" };
    mockState.profile = { telegram_id: 99887766, telegram_username: "foodlover" };
    mockState.authError = null;
    mockState.dbError = null;
    mockState.rpcError = null;
  });

  describe("getTelegramStatus", () => {
    it("should return linked status with username for linked profile", async () => {
      const res = await getTelegramStatus();
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.isLinked).toBe(true);
        expect(res.data.telegramUsername).toBe("foodlover");
        expect(res.data.telegramId).toBe(99887766);
      }
    });

    it("should return unlinked status when telegram_id is null", async () => {
      mockState.profile = { telegram_id: null, telegram_username: null };
      const res = await getTelegramStatus();
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.isLinked).toBe(false);
        expect(res.data.telegramUsername).toBeNull();
      }
    });

    it("should fail when user is not authenticated", async () => {
      mockState.user = null;
      const res = await getTelegramStatus();
      expect(res.success).toBe(false);
    });
  });

  describe("generateTelegramLink", () => {
    it("should return cryptographically generated deep link", async () => {
      const res = await generateTelegramLink();
      expect(res.success).toBe(true);
      if (res.success && res.data) {
        expect(res.data.token).toBe("test_token_abc123");
        expect(res.data.deepLink).toContain("https://t.me/");
        expect(res.data.deepLink).toContain("start=link_test_token_abc123");
      }
    });

    it("should return error if RPC fails", async () => {
      mockState.rpcError = { message: "RPC error" };
      const res = await generateTelegramLink();
      expect(res.success).toBe(false);
    });
  });

  describe("unlinkTelegram", () => {
    it("should successfully unlink account", async () => {
      const res = await unlinkTelegram();
      expect(res.success).toBe(true);
    });

    it("should return error when unauthenticated", async () => {
      mockState.user = null;
      const res = await unlinkTelegram();
      expect(res.success).toBe(false);
    });
  });
});
