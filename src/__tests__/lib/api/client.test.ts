import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";

let accessToken: string | undefined;
const createClient = mock(async () => ({
  auth: {
    getSession: async () => ({
      data: { session: accessToken ? { access_token: accessToken } : null },
    }),
  },
}));
mock.module("@/lib/supabase/server", () => ({ createClient }));

const { apiCall, apiGet, apiPost } = await import("@/lib/api/client");
const originalFetch = globalThis.fetch;
const fetchMock = mock<typeof fetch>();

beforeEach(() => {
  accessToken = "test-user-token";
  createClient.mockClear();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("Edge Function transport", () => {
  test("includes authentication, gateway key, and lossless query parameters", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: [] }));
    const result = await apiGet("api-v1-products", {
      lat: 0,
      lng: 0,
      active: false,
      cursor: undefined,
    });
    expect(result.success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.toString()).toBe("lat=0&lng=0&active=false");
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-user-token");
    expect(headers.get("apikey")).toBe(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    expect(init?.body).toBeUndefined();
  });

  test("public requests do not read or send a user session", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: [] }));
    await apiGet("api-v1-products", undefined, { skipAuth: true });
    expect(createClient).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has("Authorization")).toBe(false);
  });

  test("rejects unauthenticated mutations before fetching", async () => {
    accessToken = undefined;
    const result = await apiPost("api-v1-products", { title: "Apples" });
    expect(result).toMatchObject({ success: false, error: { code: "UNAUTHORIZED" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("preserves false JSON bodies and caller idempotency keys", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: false }));
    await apiPost("api-v1-preferences", false, { idempotencyKey: "test-operation" });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.body).toBe("false");
    expect(new Headers(init?.headers).get("X-Idempotency-Key")).toBe("test-operation");
  });

  test("accepts a successful response with no content", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await apiCall("api-v1-products", { method: "DELETE" })).toEqual({
      success: true,
      data: undefined,
    });
  });

  test.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [413, "PAYLOAD_TOO_LARGE"],
    [429, "RATE_LIMIT"],
    [502, "SERVICE_UNAVAILABLE"],
    [503, "SERVICE_UNAVAILABLE"],
  ])("maps a non-JSON HTTP %i response to %s", async (status, code) => {
    fetchMock.mockResolvedValue(new Response("<html>Gateway error</html>", { status }));
    expect(await apiGet("api-v1-products")).toMatchObject({ success: false, error: { code } });
  });

  test("does not accept a success envelope with a failing HTTP status", async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true, data: { id: 1 } }, { status: 500 }));
    expect(await apiGet("api-v1-products")).toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
  });

  test("preserves structured backend errors and details", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          success: false,
          error: { code: "CONFLICT", message: "Refresh this listing", details: { version: 2 } },
        },
        { status: 409 }
      )
    );
    expect(await apiGet("api-v1-products")).toMatchObject({
      success: false,
      error: { code: "CONFLICT", message: "Refresh this listing", details: { version: 2 } },
    });
  });

  test.each([null, [], { success: true }, { success: "true", data: [] }].map((body) => [body]))(
    "rejects a malformed success response %j",
    async (body) => {
      fetchMock.mockResolvedValue(Response.json(body));
      expect(await apiGet("api-v1-products")).toMatchObject({
        success: false,
        error: { code: "INTERNAL_ERROR" },
      });
    }
  );

  test("clears the timeout after a network failure", async () => {
    const clearTimeoutSpy = spyOn(globalThis, "clearTimeout");
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await apiGet("api-v1-products")).toMatchObject({
      success: false,
      error: { code: "NETWORK_ERROR" },
    });
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test("keeps the timeout active while reading the response body", async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      const stream = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener(
            "abort",
            () => {
              controller.error(new DOMException("Aborted", "AbortError"));
            },
            { once: true }
          );
        },
      });
      return new Response(stream, { headers: { "Content-Type": "application/json" } });
    });
    expect(await apiGet("api-v1-products", undefined, { timeout: 10 })).toMatchObject({
      success: false,
      error: { code: "TIMEOUT" },
    });
  });
});
