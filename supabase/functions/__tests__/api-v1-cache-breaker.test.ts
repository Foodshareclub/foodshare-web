/**
 * api-v1-cache with the shared Upstash breaker (task 23.2): TTL on every
 * write, a 503 with Retry-After while Upstash is skipped, and health that
 * reports from cached state instead of spending a PING per request.
 *
 * `globalThis.fetch` is stubbed: it answers the Vault RPC for the Redis
 * credentials and records every request that would reach Upstash.
 */
import { assert, assertEquals } from "@std/assert";
import { type HandlerContext } from "../_shared/api-handler.ts";
import { resetSupabaseClient } from "../_shared/supabase.ts";
import { resetUpstashBreakers, UPSTASH_COOLDOWN_MS } from "../_shared/upstash-breaker.ts";
import { redisBreaker } from "../_shared/upstash-redis.ts";
import {
  handleGetRequest,
  HEALTH_SAMPLE_TTL_MS,
  resetHealthSample,
} from "../api-v1-cache/lib/health.ts";
import { handleCacheOperation } from "../api-v1-cache/lib/operations.ts";
import type { CacheOperationRequest } from "../api-v1-cache/lib/types.ts";

const INTERNAL_SECRET = "test-internal-service-secret-0123456789abcdef";
const REDIS_URL = "https://cache-breaker-test.invalid";
const REDIS_TOKEN = "cache-breaker-token-must-not-leak";
const USER = "11111111-2222-3333-4444-555555555555";
const QUOTA = { error: "ERR max requests limit exceeded. Limit: 500000, Usage: 500000" };

type RedisResponder = (command: unknown) => Response;

async function withCache(
  redis: RedisResponder,
  fn: (ctl: { redisRequests: unknown[]; advance: (ms: number) => void }) => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  const names = ["INTERNAL_SERVICE_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
  const previous = names.map((n) => Deno.env.get(n));
  let now = 1_700_000_000_000;
  const redisRequests: unknown[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/rest/v1/rpc/get_secret_audited")) {
      const params = JSON.parse(String(init?.body ?? "{}")) as { secret_name?: string };
      return Promise.resolve(
        Response.json(params.secret_name === "UPSTASH_REDIS_URL" ? REDIS_URL : REDIS_TOKEN),
      );
    }
    if (url.includes("/rest/v1/rpc/get_vault_secret")) {
      return Promise.resolve(Response.json({ code: "PGRST500", message: "x" }, { status: 500 }));
    }
    if (url.startsWith(REDIS_URL)) {
      const body = JSON.parse(String(init?.body ?? "null"));
      redisRequests.push(body);
      return Promise.resolve(redis(body));
    }
    return Promise.reject(new Error(`unexpected URL ${url}`));
  }) as typeof fetch;
  Date.now = () => now;
  Deno.env.set("INTERNAL_SERVICE_SECRET", INTERNAL_SECRET);
  Deno.env.set("SUPABASE_URL", "http://vault-stub.test:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-not-real");
  resetSupabaseClient();
  resetUpstashBreakers();
  resetHealthSample();
  try {
    await fn({ redisRequests, advance: (ms) => (now += ms) });
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    names.forEach((n, i) => {
      const v = previous[i];
      if (v === undefined) Deno.env.delete(n);
      else Deno.env.set(n, v);
    });
    resetSupabaseClient();
    resetUpstashBreakers();
    resetHealthSample();
  }
}

function opCtx(body: Record<string, unknown>): HandlerContext<CacheOperationRequest> {
  return {
    request: new Request("https://api.example.test/functions/v1/api-v1-cache", { method: "POST" }),
    corsHeaders: {},
    userId: USER,
    body,
    // The rate limiter's RPC: always within the limit.
    supabase: { rpc: () => Promise.resolve({ data: true, error: null }) },
  } as unknown as HandlerContext<CacheOperationRequest>;
}

function getCtx(check: string): HandlerContext {
  return {
    request: new Request(`https://api.example.test/functions/v1/api-v1-cache?check=${check}`, {
      headers: { authorization: `Bearer ${INTERNAL_SECRET}` },
    }),
    corsHeaders: {},
  } as unknown as HandlerContext;
}

const okRedis: RedisResponder = (command) => {
  const name = String((command as unknown[])[0]).toUpperCase();
  if (name === "SET") return Response.json({ result: "OK" });
  if (name === "INFO") return Response.json({ result: "keyspace_hits:10\nkeyspace_misses:1" });
  return Response.json({ result: name === "PING" ? "PONG" : 1 });
};

// --- TTL on every write ---------------------------------------------------------

Deno.test("writes: set carries EX, incr and hincrby get a default expiry that does not extend a window", async () => {
  await withCache(okRedis, async ({ redisRequests }) => {
    await handleCacheOperation(opCtx({ operation: "set", key: "k1", value: "v" }));
    await handleCacheOperation(opCtx({ operation: "incr", key: "counter" }));
    await handleCacheOperation(opCtx({ operation: "hincrby", key: "h", field: "f" }));
    await handleCacheOperation(opCtx({ operation: "incr", key: "counter2", ttl: 60 }));
    assertEquals(redisRequests, [
      ["SET", `user:${USER}:k1`, "v", "EX", 900],
      ["INCR", `user:${USER}:counter`],
      ["EXPIRE", `user:${USER}:counter`, 900, "NX"],
      ["HINCRBY", `user:${USER}:h`, "f", 1],
      ["EXPIRE", `user:${USER}:h`, 900, "NX"],
      ["INCR", `user:${USER}:counter2`],
      ["EXPIRE", `user:${USER}:counter2`, 60],
    ]);
  });
});

Deno.test("writes: list, hash, set and sorted-set writes without a ttl still get the default expiry", async () => {
  await withCache(okRedis, async ({ redisRequests }) => {
    await handleCacheOperation(opCtx({ operation: "lpush", key: "l", values: ["a"] }));
    await handleCacheOperation(opCtx({ operation: "hset", key: "h", field: "f", value: "v" }));
    await handleCacheOperation(opCtx({ operation: "sadd", key: "s", values: ["a"] }));
    await handleCacheOperation(opCtx({ operation: "zadd", key: "z", score: 1, member: "m" }));
    const expires = (redisRequests as unknown[][]).filter((c) => c[0] === "EXPIRE");
    assertEquals(expires.length, 4, "one expiry per write");
    for (const command of expires) assertEquals(command.slice(2), [900, "NX"]);
  });
});

// --- breaker: 503 and no Upstash calls -------------------------------------------

Deno.test("quota: the first failure answers 503 with Retry-After and later calls skip Vault and Upstash", async () => {
  await withCache(
    () => Response.json(QUOTA, { status: 400 }),
    async ({ redisRequests, advance }) => {
      const first = await handleCacheOperation(opCtx({ operation: "get", key: "k" }));
      assertEquals(first.status, 503);
      assertEquals(first.headers.get("Retry-After"), String(UPSTASH_COOLDOWN_MS / 1000));
      assertEquals(redisRequests.length, 1);

      for (let i = 0; i < 3; i++) {
        const skipped = await handleCacheOperation(opCtx({ operation: "get", key: "k" }));
        assertEquals(skipped.status, 503);
      }
      assertEquals(redisRequests.length, 1, "no Upstash request while the breaker is open");

      // Health says degraded, from state, with no Upstash call.
      const ping = await (await handleGetRequest(getCtx("ping"))).json();
      assertEquals(ping.data.status, "degraded");
      assertEquals(ping.data.circuitBreaker, "open");
      assertEquals(redisRequests.length, 1);

      advance(UPSTASH_COOLDOWN_MS);
      assertEquals(redisBreaker().wouldSkip(), false);
    },
  );
});

Deno.test("recovery: after the cool-down one try succeeds and the cache works again", async () => {
  let quota = true;
  await withCache(
    () => quota ? Response.json(QUOTA, { status: 400 }) : Response.json({ result: "hello" }),
    async ({ redisRequests, advance }) => {
      assertEquals(
        (await handleCacheOperation(opCtx({ operation: "get", key: "recover-before" }))).status,
        503,
      );
      quota = false;
      advance(UPSTASH_COOLDOWN_MS);
      // Keys are unique per test: reads of the same key within 50 ms are
      // coalesced onto one promise (existing behaviour, module state shared
      // by every test in this process).
      const recovered = await handleCacheOperation(
        opCtx({ operation: "get", key: "recover-after" }),
      );
      assertEquals(recovered.status, 200);
      assertEquals(redisRequests.length, 2);
      assertEquals(redisBreaker().snapshot().state, "closed");
    },
  );
});

Deno.test("validation errors do not count against the breaker", async () => {
  await withCache(okRedis, async () => {
    for (let i = 0; i < 10; i++) {
      try {
        await handleCacheOperation(opCtx({ operation: "get" })); // missing key
      } catch { /* ValidationError is expected */ }
    }
    assertEquals(redisBreaker().snapshot().state, "closed");
  });
});

// --- health from cached state ------------------------------------------------------

Deno.test("health: one live sample, then cached for an hour; none while the breaker is open", async () => {
  await withCache(okRedis, async ({ redisRequests, advance }) => {
    const first = await (await handleGetRequest(getCtx("health"))).json();
    assertEquals(first.data.checks.connectivity.status, "pass");
    const liveCommands = redisRequests.length;
    assertEquals(liveCommands, 5, "PING plus four INFO reads, once");

    for (let i = 0; i < 12; i++) await handleGetRequest(getCtx("health")); // the watchdog's polls
    assertEquals(redisRequests.length, liveCommands, "cached: no Redis command per request");
    const cached = await (await handleGetRequest(getCtx("health"))).json();
    assertEquals(cached.data.cached, true);

    advance(HEALTH_SAMPLE_TTL_MS);
    await handleGetRequest(getCtx("health"));
    assertEquals(redisRequests.length, liveCommands * 2, "a fresh sample after the hour");

    // Breaker open: degraded, from state, with no Redis command and no Vault read.
    advance(HEALTH_SAMPLE_TTL_MS);
    redisBreaker().recordFailure("quota");
    const before = redisRequests.length;
    const degraded = await handleGetRequest(getCtx("health"));
    const body = await degraded.json();
    assertEquals(body.data.status, "degraded");
    assertEquals(body.data.redis, "skipped");
    assert(!JSON.stringify(body).includes(REDIS_TOKEN));
    assertEquals(redisRequests.length, before);
  });
});
