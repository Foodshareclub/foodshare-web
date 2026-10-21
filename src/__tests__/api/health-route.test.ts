import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * The health route.
 *
 * It is the estate's own statement about itself, and it was wrong: the
 * route asked PostgREST for "/rest/v1/?select=1", and "1" is not a
 * column. PostgREST cannot parse the select, answers 400, and the route
 * reported the database as down -- while the same key read the same data
 * through the same service everywhere else, and the deployment's own
 * smoke test asked PostgREST for "/rest/v1/" and got 200.
 *
 * The route answered 503 with it, the site showed its maintenance banner
 * to everybody, and the deployment's health gate could not tell a broken
 * estate from a broken probe.
 *
 * These tests pin the properties that fix depends on: the database probe
 * asks for something PostgREST can answer, a service that answers is up,
 * a service that does not is down, and a service whose configuration is
 * the template's example is not probed at all.
 */

const mockState = {
  /** What each URL answers with, and how long it takes. */
  responses: new Map<string, { status: number; body?: string }>(),
  /** Every URL that was asked for. */
  asked: [] as string[],
};

mock.module("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
  // The route waits for the request to be available before it reads the
  // request-dependent state. There is no request here.
  connection: () => Promise.resolve(),
}));

import { GET } from "@/app/api/health/route";

function url(path: string): string {
  return `https://api.foodshare.club${path}`;
}

describe("GET /api/health", () => {
  beforeEach(() => {
    mockState.responses.clear();
    mockState.asked = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://api.foodshare.club";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.UPSTASH_REDIS_REST_URL = "";

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      mockState.asked.push(href);
      const answer = mockState.responses.get(href);
      if (!answer) {
        return new Response("not found", { status: 404 });
      }
      return new Response(answer.body ?? "", { status: answer.status });
    }) as typeof fetch;
  });

  it("asks PostgREST for a row it can answer, not for a column named 1", async () => {
    mockState.responses.set(url("/rest/v1/posts_with_location?select=id&limit=1"), { status: 200 });
    mockState.responses.set(url("/auth/v1/health"), { status: 200 });
    mockState.responses.set(url("/storage/v1/status"), { status: 200 });

    const response = await GET();
    const body = (await response.json()) as { status: string; database: boolean };

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.database).toBe(true);
    // The old probe asked for "/rest/v1/?select=1", which PostgREST cannot
    // parse, so the database read as down while it was serving.
    expect(mockState.asked).not.toContain(url("/rest/v1/?select=1"));
  });

  it("reports the database as down when PostgREST cannot answer", async () => {
    mockState.responses.set(url("/rest/v1/posts_with_location?select=id&limit=1"), { status: 500 });
    mockState.responses.set(url("/auth/v1/health"), { status: 200 });
    mockState.responses.set(url("/storage/v1/status"), { status: 200 });

    const response = await GET();
    const body = (await response.json()) as { status: string; services: { database: string } };

    expect(response.status).toBe(503);
    expect(body.services.database).toBe("down");
  });

  it("reports the database as down when the request fails outright", async () => {
    mockState.responses.set(url("/auth/v1/health"), { status: 200 });
    mockState.responses.set(url("/storage/v1/status"), { status: 200 });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (href.includes("/rest/v1/")) throw new Error("connection refused");
      return new Response("", { status: 200 });
    }) as typeof fetch;

    const response = await GET();
    const body = (await response.json()) as { services: { database: string } };

    expect(response.status).toBe(503);
    expect(body.services.database).toBe("down");
  });

  it("does not probe a cache whose configuration is the template's example", async () => {
    mockState.responses.set(url("/rest/v1/posts_with_location?select=id&limit=1"), { status: 200 });
    mockState.responses.set(url("/auth/v1/health"), { status: 200 });
    mockState.responses.set(url("/storage/v1/status"), { status: 200 });
    process.env.UPSTASH_REDIS_REST_URL = "https://your-instance.upstash.io";

    const response = await GET();
    const body = (await response.json()) as { status: string; services: { redis?: string } };

    expect(response.status).toBe(200);
    expect(body.services.redis).toBeUndefined();
    expect(mockState.asked.some((href) => href.includes("upstash"))).toBe(false);
  });
});
