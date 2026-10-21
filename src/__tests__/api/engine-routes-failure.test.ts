import { describe, expect, it, mock } from "bun:test";

/**
 * What the engine endpoints answer when something breaks on the server.
 *
 * The endpoints are public and unauthenticated, so the message of a
 * fault is not repeated to the caller: it can name a module, a field or
 * a file. It is logged instead, where it belongs, and the caller is told
 * that the request failed.
 */

const logged: Array<{ message: string; error?: Error }> = [];

mock.module("@/lib/logger", () => ({
  createLogger: () => ({
    error: (message: string, error?: Error) => {
      logged.push({ message, error });
    },
    warn: () => {},
    info: () => {},
    debug: () => {},
  }),
  logger: {
    error: (message: string, error?: Error) => {
      logged.push({ message, error });
    },
    warn: () => {},
    info: () => {},
    debug: () => {},
  },
}));

mock.module("@/lib/wasm-search", () => ({
  calculateHybridScore: () => {
    throw new Error("memory access out of bounds at foodshare_search_bg.wasm");
  },
  calculateDistanceDecay: () => 0,
}));

const { POST } = await import("@/app/api/[[...route]]/route");

function post(path: string, body: unknown): Request {
  return new Request(`https://foodshare.club/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("an engine request that breaks on the server", () => {
  it("answers with a 500 and a message that says nothing about the fault", async () => {
    const response = await POST(
      post("/engine/search/hybrid", { textQuery: "bread", targetText: "Fresh bread" }),
    );

    expect(response.status).toBe(500);
    const parsed = (await response.json()) as Record<string, unknown>;
    expect(parsed.error).toBe("Internal error");
    expect(String(parsed.error)).not.toContain("wasm");
    expect(String(parsed.error)).not.toContain("memory");
  });

  it("records the fault where it belongs", async () => {
    logged.length = 0;

    const response = await POST(
      post("/engine/search/hybrid", { textQuery: "bread", targetText: "Fresh bread" }),
    );

    expect(response.status).toBe(500);
    expect(logged).toHaveLength(1);
    expect(logged[0].error?.message).toContain("memory access out of bounds");
  });

  it("still answers a body it cannot use with a 400", async () => {
    const response = await POST(post("/engine/search/hybrid", { textQuery: 42, targetText: "Fresh bread" }));

    expect(response.status).toBe(400);
  });
});
