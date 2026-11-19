import { mock, test, expect } from "bun:test";
import { NextRequest } from "next/server";

/**
 * The 2026-11-15 incident, replayed. Upstash answered every REST call with
 * "ERR max requests limit exceeded. Limit: 500000, Usage: 500001" (the
 * monthly request quota), the rate limiters let that throw out of
 * `limit()`, and the middleware 500'd every request — including the
 * /api/ready health probe, so the container went unhealthy too and the site
 * stayed down for 25 h. The only thing wrong was a counter in a billing
 * dashboard.
 *
 * The real `@upstash/redis` is replaced with a client whose Lua-script
 * calls throw the production error. That is the seam the incident lived on:
 * the REST client throws, `@upstash/ratelimit` propagates it out of
 * `limit()`, and the middleware decides what a limit error means. The
 * decision under test: the request is still served (200), the limit is
 * skipped for that pass, and the circuit breaker stops paying Upstash on
 * every request.
 *
 * The proxy reads its environment at module load, so the env must be set
 * before the import, and the import must be dynamic. `NODE_ENV=production`
 * with no `CI` is what arms the rate-limiting guard
 * (`isRateLimitingRequired`) — the exact production shape.
 */

const QUOTA_ERROR = "ERR max requests limit exceeded. Limit: 500000, Usage: 500001";

class QuotaExhaustedRedis {
  /** Every Upstash REST call that leaves the process. */
  static calls = 0;

  constructor(_options?: unknown) {}

  // `@upstash/ratelimit` evaluates the window script through `evalsha`
  // (falling back to `eval` on NOSCRIPT). The quota error is not NOSCRIPT,
  // so both seams throw the production message and the test is insensitive
  // to which one the library picks.
  async evalsha(): Promise<never> {
    QuotaExhaustedRedis.calls++;
    throw new Error(QUOTA_ERROR);
  }

  async eval(): Promise<never> {
    QuotaExhaustedRedis.calls++;
    throw new Error(QUOTA_ERROR);
  }

  // The analytics record uses a pipeline; with the quota exhausted the
  // limit script rejects first, so this is belt and braces.
  pipeline(): never {
    QuotaExhaustedRedis.calls++;
    throw new Error(QUOTA_ERROR);
  }
}

mock.module("@upstash/redis", () => ({ Redis: QuotaExhaustedRedis }));

// `@types/node` marks NODE_ENV readonly, but it is just an environment
// variable, and the production shape must be set before the import.
(process.env as Record<string, string | undefined>).NODE_ENV = "production";
delete process.env.CI;
process.env.UPSTASH_REDIS_REST_URL = "https://quota-exhausted.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "not-a-real-token";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.NEXT_PUBLIC_APP_URL = "https://foodshare.club";

const { proxy } = await import("../proxy");

function request(path: string, init?: { method?: string; origin?: string }): NextRequest {
  const req = new NextRequest(`https://foodshare.club${path}`, {
    method: init?.method ?? "GET",
  });
  // `origin` is a forbidden header name: undici drops it during Request
  // construction, so it is set post-hoc — which is also where the server
  // actually sees it.
  if (init?.origin) req.headers.set("origin", init.origin);
  return req;
}

test("an exhausted Upstash quota degrades the proxy instead of 500ing (2026-11-15 incident)", async () => {
  // 1. The home page. The global limiter's Upstash call throws the quota
  //    error; the request is still served. One evalsha left the process.
  let response = await proxy(request("/"));
  expect(response.status).toBe(200);
  expect(QuotaExhaustedRedis.calls).toBe(1);

  // 2. An auth endpoint. Both the auth limiter and the global limiter
  //    degrade; still 200. Three calls in total.
  response = await proxy(request("/auth/login"));
  expect(response.status).toBe(200);
  expect(QuotaExhaustedRedis.calls).toBe(3);

  // 3. A mutation. The mutation limiter degrades too. This is the fifth
  //    consecutive Upstash failure, which opens the breaker.
  response = await proxy(request("/api/posts", { method: "POST", origin: "https://foodshare.club" }));
  expect(response.status).toBe(200);
  expect(QuotaExhaustedRedis.calls).toBe(5);

  // 4. Breaker open: the next request is served without paying Upstash
  //    again. The counter stays put — the degradation no longer costs a
  //    rejected request per request while the quota is exhausted.
  response = await proxy(request("/"));
  expect(response.status).toBe(200);
  expect(QuotaExhaustedRedis.calls).toBe(5);
});

test("the health probe no longer pays the global limiter", async () => {
  // The quadlet health probe curls /api/ready every 20 s. It must be
  // served while Upstash is erroring — that is what was marking the
  // container unhealthy and triggering autoheal on a billing event — and
  // it must not consume the limiter at all: zero new Upstash calls from
  // this request, no matter what state the breaker is in. The assertion
  // is relative so the test holds in any execution order.
  const callsBefore = QuotaExhaustedRedis.calls;
  const response = await proxy(request("/api/ready"));
  expect(response.status).toBe(200);
  expect(QuotaExhaustedRedis.calls).toBe(callsBefore);
});
