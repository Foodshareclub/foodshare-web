/**
 * Upstash circuit breaker, shared Redis client, Vector client and translation
 * cache (task 23.2).
 *
 * No real Upstash is called: `globalThis.fetch` is replaced with a stub that
 * records the requests it receives and answers like Upstash does, including
 * the quota error `ERR max requests limit exceeded`. The clock is `Date.now`,
 * replaced per test, so the 10-minute cool-down needs no waiting.
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  classifyUpstashFailure,
  getUpstashBreaker,
  resetUpstashBreakers,
  UPSTASH_COOLDOWN_MS,
  UpstashBreaker,
} from "../_shared/upstash-breaker.ts";
import {
  redisBreaker,
  upstashCommand,
  UpstashCommandError,
  upstashPipeline,
  UpstashUnavailableError,
} from "../_shared/upstash-redis.ts";
import {
  createVectorClient,
  UPSTASH_VECTOR_BREAKER,
  VectorClientError,
} from "../_shared/upstash-vector.ts";
import {
  resetTranslationCacheForTests,
  translationCache,
} from "../api-v1-localization/services/translation-cache.ts";

const QUOTA_BODY = { error: "ERR max requests limit exceeded. Limit: 500000, Usage: 500000" };
const CREDS = { url: "https://redis-breaker-test.invalid", token: "breaker-test-token" };

interface Recorded {
  url: string;
  body: unknown;
}

type Responder = (req: Recorded) => Response | Promise<Response> | Error;

/** Run `fn` with fetch and the clock stubbed; returns the recorded requests. */
async function withStubs(
  responder: Responder,
  fn: (ctl: { requests: Recorded[]; advance: (ms: number) => void }) => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  const realNow = Date.now;
  let now = 1_700_000_000_000;
  const requests: Recorded[] = [];
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const rec: Recorded = {
      url,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    };
    requests.push(rec);
    const out = responder(rec);
    return out instanceof Error ? Promise.reject(out) : Promise.resolve(out);
  }) as typeof fetch;
  Date.now = () => now;
  resetUpstashBreakers();
  try {
    await fn({ requests, advance: (ms) => (now += ms) });
  } finally {
    globalThis.fetch = realFetch;
    Date.now = realNow;
    resetUpstashBreakers();
  }
}

// --- classification -----------------------------------------------------------

Deno.test("classify: quota, auth, timeout and unavailable open the breaker; command errors do not", () => {
  assertEquals(
    classifyUpstashFailure({ status: 400, message: "ERR max requests limit exceeded" }),
    "quota",
  );
  assertEquals(classifyUpstashFailure({ status: 429 }), "quota");
  assertEquals(classifyUpstashFailure({ status: 401, message: "Unauthorized" }), "auth");
  assertEquals(classifyUpstashFailure({ message: "WRONGPASS invalid or missing token" }), "auth");
  assertEquals(
    classifyUpstashFailure({ error: new DOMException("timed out", "TimeoutError") }),
    "timeout",
  );
  assertEquals(classifyUpstashFailure({ status: 503 }), "unavailable");
  assertEquals(classifyUpstashFailure({ error: new TypeError("fetch failed") }), "unavailable");
  assertEquals(
    classifyUpstashFailure({
      status: 400,
      message: "ERR WRONGTYPE Operation against a key holding the wrong kind of value",
    }),
    null,
  );
});

// --- breaker state machine ------------------------------------------------------

Deno.test("breaker: open for 10 minutes, then exactly one half-open try, then close or reopen", () => {
  let now = 1000;
  const breaker = new UpstashBreaker("t", { now: () => now });
  assertEquals(UPSTASH_COOLDOWN_MS, 600_000);
  assert(breaker.allow(), "closed allows");

  breaker.recordFailure("quota");
  assertEquals(breaker.snapshot().state, "open");
  assert(breaker.wouldSkip());
  assertEquals(breaker.allow(), false);
  now += UPSTASH_COOLDOWN_MS - 1;
  assertEquals(breaker.allow(), false, "still cooling down 1 ms before the end");

  now += 1;
  assertEquals(breaker.wouldSkip(), false, "the pre-check does not take the probe slot");
  assert(breaker.allow(), "first caller after the cool-down is the half-open try");
  assertEquals(breaker.snapshot().state, "half-open");
  assertEquals(breaker.allow(), false, "other callers keep skipping while the probe is in flight");

  breaker.recordFailure("quota"); // the probe failed
  assertEquals(breaker.snapshot().state, "open");
  assertEquals(breaker.allow(), false);

  now += UPSTASH_COOLDOWN_MS;
  assert(breaker.allow());
  breaker.recordSuccess(); // the probe succeeded
  assertEquals(breaker.snapshot().state, "closed");
  assert(breaker.allow() && breaker.allow(), "closed again for everyone");
  assertEquals(breaker.isDegraded(), false);
});

Deno.test("breaker: a half-open probe that never reports frees its slot", () => {
  let now = 0;
  const breaker = new UpstashBreaker("lease", { now: () => now });
  breaker.recordFailure("timeout");
  now += UPSTASH_COOLDOWN_MS;
  assert(breaker.allow());
  assertEquals(breaker.allow(), false);
  now += 30_000;
  assert(breaker.allow(), "a lost probe cannot wedge the breaker");
});

// --- shared Redis client --------------------------------------------------------

Deno.test("redis client: a quota error opens the breaker and later calls make no request", async () => {
  await withStubs(() => Response.json(QUOTA_BODY, { status: 400 }), async ({ requests }) => {
    const error = (await assertRejects(
      () => upstashCommand(CREDS, ["GET", "k"]),
      UpstashUnavailableError,
    )) as UpstashUnavailableError;
    assertEquals(error.kind, "quota");
    assertEquals(error.skipped, false);
    assertEquals(requests.length, 1);
    assert(!error.message.includes(CREDS.token), "the token never reaches an error message");

    for (let i = 0; i < 5; i++) {
      const skipped = (await assertRejects(
        () => upstashCommand(CREDS, ["GET", "k"]),
        UpstashUnavailableError,
      )) as UpstashUnavailableError;
      assertEquals(skipped.skipped, true);
    }
    assertEquals(requests.length, 1, "no further Upstash request while the breaker is open");
    assertEquals(redisBreaker().snapshot().state, "open");
  });
});

Deno.test("redis client: after the cool-down one try goes through and closes the breaker", async () => {
  let quota = true;
  await withStubs(
    () => quota ? Response.json(QUOTA_BODY, { status: 400 }) : Response.json({ result: "v" }),
    async ({ requests, advance }) => {
      await assertRejects(() => upstashCommand(CREDS, ["GET", "k"]), UpstashUnavailableError);
      quota = false; // the monthly reset
      advance(UPSTASH_COOLDOWN_MS - 1);
      await assertRejects(() => upstashCommand(CREDS, ["GET", "k"]), UpstashUnavailableError);
      assertEquals(requests.length, 1);
      advance(1);
      assertEquals(await upstashCommand(CREDS, ["GET", "k"]), "v");
      assertEquals(requests.length, 2);
      assertEquals(redisBreaker().snapshot().state, "closed");
      assertEquals(await upstashCommand(CREDS, ["GET", "k"]), "v");
    },
  );
});

Deno.test("redis client: auth, timeout and network failures open the breaker; a command error does not", async () => {
  const failures: Array<[string, Responder]> = [
    ["auth", () => Response.json({ error: "WRONGPASS invalid token" }, { status: 401 })],
    ["timeout", () => new DOMException("The signal has been aborted", "TimeoutError") as Error],
    ["unavailable", () => new TypeError("fetch failed")],
  ];
  for (const [kind, responder] of failures) {
    await withStubs(responder, async () => {
      const error = (await assertRejects(
        () => upstashCommand(CREDS, ["GET", "k"]),
        UpstashUnavailableError,
      )) as UpstashUnavailableError;
      assertEquals(error.kind, kind);
      assertEquals(redisBreaker().snapshot().state, "open");
    });
  }
  await withStubs(
    () => Response.json({ error: "ERR WRONGTYPE bad type" }, { status: 400 }),
    async () => {
      await assertRejects(() => upstashCommand(CREDS, ["GET", "k"]), UpstashCommandError);
      assertEquals(redisBreaker().snapshot().state, "closed");
    },
  );
});

Deno.test("redis client: pipeline is one /pipeline request", async () => {
  await withStubs(
    () => Response.json([{ result: "OK" }, { result: 1 }]),
    async ({ requests }) => {
      const out = await upstashPipeline(CREDS, [["SET", "a", "1", "EX", 60], ["EXPIRE", "a", 60]]);
      assertEquals(out, ["OK", 1]);
      assertEquals(requests.length, 1);
      assertEquals(requests[0].url, `${CREDS.url}/pipeline`);
    },
  );
});

// --- Vector client --------------------------------------------------------------

Deno.test("vector client: quota opens its own breaker, is not retried, and later calls skip Upstash", async () => {
  await withStubs(
    () => new Response("ERR max requests limit exceeded", { status: 400 }),
    async ({ requests, advance }) => {
      const client = createVectorClient({ url: "https://vector-test.invalid", token: "t" });
      assert(client.isHealthy());
      await assertRejects(() => client.query([0.1, 0.2]), VectorClientError, "API error");
      assertEquals(requests.length, 1, "a quota failure is not retried");
      assertEquals(client.isHealthy(), false);
      assertEquals(getUpstashBreaker(UPSTASH_VECTOR_BREAKER).snapshot().state, "open");
      assertEquals(redisBreaker().snapshot().state, "closed", "Redis has its own breaker");

      const skipped = (await assertRejects(
        () => client.query([0.1, 0.2]),
        VectorClientError,
      )) as VectorClientError;
      assertEquals(skipped.code, "CIRCUIT_OPEN");
      assertEquals(requests.length, 1);

      advance(UPSTASH_COOLDOWN_MS);
      await assertRejects(() => client.query([0.1, 0.2]), VectorClientError, "API error");
      assertEquals(requests.length, 2, "one half-open try after the cool-down");
    },
  );
});

Deno.test("vector client: healthy path is unchanged", async () => {
  await withStubs(
    () => Response.json({ result: [{ id: "p1", score: 0.9 }] }),
    async ({ requests }) => {
      const client = createVectorClient({ url: "https://vector-test.invalid", token: "t" });
      const results = await client.query([0.1], { topK: 3 });
      assertEquals(results, [{ id: "p1", score: 0.9 }]);
      assertEquals(requests.length, 1);
      assert(client.isHealthy());
    },
  );
});

// --- translation cache ----------------------------------------------------------

Deno.test("translation cache: every write carries a TTL and a namespaced key; quota falls back to a miss", async () => {
  const env = ["REDIS_HTTP_URL", "REDIS_HTTP_TOKEN"] as const;
  const previous = env.map((name) => Deno.env.get(name));
  Deno.env.set("REDIS_HTTP_URL", "https://translation-test.invalid");
  Deno.env.set("REDIS_HTTP_TOKEN", "translation-test-token");
  resetTranslationCacheForTests();
  let quota = false;
  try {
    await withStubs(
      () => quota ? Response.json(QUOTA_BODY, { status: 400 }) : Response.json({ result: "OK" }),
      async ({ requests }) => {
        await translationCache.set("post", "123", "title", "ru", "Привет");
        assertEquals(requests[0].body, [
          "SETEX",
          "trans:post:123:title:ru",
          "86400",
          "Привет",
        ]);

        const writes = requests.length;
        quota = true;
        assertEquals(await translationCache.get("post", "123", "title", "ru"), null);
        assertEquals(requests.length, writes + 1, "the quota error is the last request");

        // The breaker is open: reads, writes and invalidations make no request.
        assertEquals(await translationCache.get("post", "123", "title", "ru"), null);
        assertEquals(
          await translationCache.getMultiple("post", "123", ["title", "description"], "ru"),
          { title: null, description: null },
        );
        await translationCache.set("post", "123", "title", "ru", "x");
        await translationCache.batchSet([
          { contentType: "post", contentId: "1", translations: { title: "a" }, locale: "ru" },
        ]);
        await translationCache.invalidate("post", "123");
        assertEquals(await translationCache.isAvailable(), false);
        assertEquals(requests.length, writes + 1, "no Upstash request while the breaker is open");
      },
    );
  } finally {
    env.forEach((name, i) => {
      const value = previous[i];
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    });
    resetTranslationCacheForTests();
  }
});

Deno.test("translation cache: batch writes are one /pipeline request, every command SETEX with a TTL", async () => {
  Deno.env.set("REDIS_HTTP_URL", "https://translation-test.invalid");
  Deno.env.set("REDIS_HTTP_TOKEN", "translation-test-token");
  resetTranslationCacheForTests();
  try {
    await withStubs(
      () => Response.json([{ result: "OK" }, { result: "OK" }]),
      async ({ requests }) => {
        await translationCache.setMultiple("post", "9", { title: "a", description: "b" }, "es");
        assertEquals(requests.length, 1);
        assertEquals(requests[0].url, "https://translation-test.invalid/pipeline");
        for (const command of requests[0].body as string[][]) {
          assertEquals(command[0], "SETEX");
          assert(command[1].startsWith("trans:post:9:"), "namespaced key");
          assert(Number(command[2]) > 0, "positive TTL");
        }
      },
    );
  } finally {
    Deno.env.delete("REDIS_HTTP_URL");
    Deno.env.delete("REDIS_HTTP_TOKEN");
    resetTranslationCacheForTests();
  }
});
