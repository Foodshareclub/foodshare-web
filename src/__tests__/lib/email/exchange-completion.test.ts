import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * Regression coverage for the exchange-completion email path.
 *
 * The original implementation was an export of `src/app/actions/email.ts`
 * (`'use server'`). Next.js ships a client-reference proxy for every export of
 * such a module, which made it callable by anyone who read the bundle: arbitrary
 * `to` address, arbitrary `itemName` / `otherPartyName`, sent from the app's
 * sending domain. It also had no auth check.
 *
 * The fix was structural, not a guard — the function moved to
 * `src/lib/email/exchange-completion.ts`, a plain `server-only` module with no
 * action boundary. The test below pins the *behaviour* we still depend on;
 * `email.test.ts` pins the *absence* of the action exports.
 */

const mockState = {
  user: null as { id: string } | null,
  authError: null as { message: string } | null,
  profile: null as { id: string } | null,
  profileError: null as { message: string } | null,
  notificationResult: {
    success: true,
    data: { messageId: "notif-1" },
    error: undefined as string | undefined,
  } as { success: boolean; data?: { messageId: string }; error?: string },
  capturedRequest: null as Record<string, unknown> | null,
};

mock.module("@/lib/supabase/server", () => ({
  createClient: mock(() =>
    Promise.resolve({
      auth: {
        getUser: mock(() => Promise.resolve({ data: { user: mockState.user }, error: mockState.authError })),
      },
      from: mock(() => ({
        select: mock(() => ({
          eq: mock(() => ({
            single: mock(() => Promise.resolve({ data: mockState.profile, error: mockState.profileError })),
          })),
        })),
      })),
    }),
  ),
  createCachedClient: mock(() => Promise.resolve({})),
}));

mock.module("@/lib/notifications", () => ({
  sendEmailNotification: mock((request: Record<string, unknown>) => {
    mockState.capturedRequest = request;
    return Promise.resolve(mockState.notificationResult);
  }),
}));

import { sendExchangeCompletionEmail } from "@/lib/email/exchange-completion";

const VALID = {
  to: "sharer@example.com",
  recipientName: "Ada",
  otherPartyName: "Grace Hopper",
  itemName: "Tomatoes",
  role: "sharer" as const,
  roomId: "3f8c1e2a-4b5d-4e6f-8a9b-0c1d2e3f4a5b",
};

describe("sendExchangeCompletionEmail", () => {
  beforeEach(() => {
    mockState.profile = { id: "user-123" };
    mockState.profileError = null;
    mockState.notificationResult = {
      success: true,
      data: { messageId: "notif-1" },
      error: undefined,
    };
    mockState.capturedRequest = null;
  });

  it("is not a server action — the module has no 'use server' directive", async () => {
    // Structural guarantee: if this ever moves back into a `'use server'` file it
    // becomes an unauthenticated email relay again. Cheap to assert, expensive
    // to rediscover.
    const src = await Bun.file("src/lib/email/exchange-completion.ts").text();
    expect(src.startsWith('import "server-only";')).toBe(true);

    // Directive position only — prose in the doc comment may mention the string.
    const directives = src
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith('"use ') || l.startsWith("'use "));
    expect(directives).toEqual([]);
  });

  it("sends a sharer-role email with a review link", async () => {
    const result = await sendExchangeCompletionEmail(VALID);

    expect(result.success).toBe(true);
    expect(mockState.capturedRequest?.userId).toBe("user-123");
    expect(mockState.capturedRequest?.type).toBe("arrangement_completed");
    expect(String(mockState.capturedRequest?.body)).toContain("You shared");
    expect(String(mockState.capturedRequest?.body)).toContain("Tomatoes");
    expect(
      String(mockState.capturedRequest?.data && (mockState.capturedRequest.data as Record<string, unknown>).reviewUrl),
    ).toContain(`room=${VALID.roomId}`);
  });

  it("uses requester wording for the requester role", async () => {
    await sendExchangeCompletionEmail({ ...VALID, role: "requester" });
    expect(String(mockState.capturedRequest?.body)).toContain("You received");
  });

  it("rejects a malformed recipient address before any send", async () => {
    const result = await sendExchangeCompletionEmail({ ...VALID, to: "not-an-email" });

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe("VALIDATION_ERROR");
    expect(mockState.capturedRequest).toBeNull();
  });

  it("rejects a non-uuid roomId before any send", async () => {
    const result = await sendExchangeCompletionEmail({ ...VALID, roomId: "12345" });

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe("VALIDATION_ERROR");
    expect(mockState.capturedRequest).toBeNull();
  });

  it("does not send when the recipient profile is unknown", async () => {
    mockState.profile = null;
    mockState.profileError = { message: "PGRST116" };

    const result = await sendExchangeCompletionEmail(VALID);

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe("NOT_FOUND");
    expect(mockState.capturedRequest).toBeNull();
  });

  it("reports a downstream send failure without throwing", async () => {
    mockState.notificationResult = { success: false, error: "provider down" };

    const result = await sendExchangeCompletionEmail(VALID);

    expect(result.success).toBe(false);
    expect(result.success === false && result.reason).toBe("INTERNAL_ERROR");
  });
});
