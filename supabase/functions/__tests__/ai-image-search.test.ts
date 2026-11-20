/**
 * imageSearch (SERP crawl) — provider contract + route auth.
 *
 * Covers the card acceptance: top-10 candidates with source provenance,
 * query-hash cache, distributed rate limit, broader city+state fallback,
 * service-auth only, fail-closed on missing credential, fingerprint-only
 * (the key never leaks into errors).
 */
import { assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import {
  AuthenticationError,
  ForbiddenError,
  RateLimitError,
  ServerError,
  ValidationError,
} from "../_shared/errors.ts";
import type { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "../api-v1-ai/lib/handlers.ts";
import {
  imageSearch,
  imageSearchCacheKey,
  type ImageSearchDeps,
  type ImageSearchInput,
  type ImageSearchResult,
  searchQueries,
  serpCandidates,
} from "../api-v1-ai/lib/providers/image-search.ts";
import type { PostBody } from "../api-v1-ai/lib/schemas.ts";

// =============================================================================
// Stubs
// =============================================================================

function serpImage(i: number, host = `example${i}.org`) {
  return {
    position: i,
    title: `Fridge photo ${i}`,
    source: `Example ${i}`,
    link: `https://${host}/fridges/${i}`,
    original: `https://cdn.${host}/img/${i}.jpg`,
    thumbnail: `https://encrypted-tbn0.gstatic.com/${i}`,
    original_width: 1200,
    original_height: 800,
  };
}

function allowLimit() {
  return Promise.resolve({
    allowed: true,
    remaining: 29,
    resetAt: Date.now() + 3_600_000,
    retryAfterMs: 0,
  });
}

function denyLimit() {
  return Promise.resolve({
    allowed: false,
    remaining: 0,
    resetAt: Date.now() + 3_600_000,
    retryAfterMs: 120_000,
  });
}

interface CacheStubOptions {
  row?: { result: ImageSearchResult; created_at: string } | null;
  upserts?: Record<string, unknown>[];
}

function stubSupabase(opts: CacheStubOptions = {}) {
  return {
    from(table: string) {
      assertEquals(table, "inference_cache");
      return {
        select: () => ({
          eq: () => ({
            gte: () => ({
              single: () => Promise.resolve({ data: opts.row ?? null, error: null }),
            }),
          }),
        }),
        upsert: (row: Record<string, unknown>) => {
          opts.upserts?.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

const baseInput: ImageSearchInput = {
  name: "Fair Oaks Community Fridge",
  city: "Fair Oaks",
  state: "CA",
  post_type: "fridge",
};

// =============================================================================
// Query construction + candidate mapping
// =============================================================================

Deno.test("queries: name+location primary, city+state fallback; no location means no fallback", () => {
  assertEquals(searchQueries(baseInput), {
    primary: "Fair Oaks Community Fridge community fridge Fair Oaks, CA",
    fallback: "community fridge Fair Oaks, CA",
  });
  assertEquals(
    searchQueries({ name: "Helping Hands", post_type: "foodbank" }),
    { primary: "Helping Hands food bank", fallback: null },
  );
  assertEquals(
    searchQueries({ ...baseInput, post_type: "foodbank" }).primary,
    "Fair Oaks Community Fridge food bank Fair Oaks, CA",
  );
});

Deno.test("candidates keep source-page provenance and drop entries without an image URL", () => {
  const images = [
    serpImage(1),
    { title: "no original", link: "https://x.org/a" },
    { original: "https://cdn.example.org/ok.jpg", link: "not a url" },
    null,
  ];
  const candidates = serpCandidates(images, 10);
  assertEquals(candidates.length, 2);
  assertEquals(candidates[0].url, "https://cdn.example1.org/img/1.jpg");
  assertEquals(candidates[0].source_url, "https://example1.org/fridges/1");
  assertEquals(candidates[0].source_domain, "example1.org");
  assertEquals(candidates[0].width, 1200);
  // Opaque source link: candidate kept, domain stays undefined (partial provenance).
  assertEquals(candidates[1].source_url, "not a url");
  assertEquals(candidates[1].source_domain, undefined);
  assertEquals(serpCandidates(undefined, 10), []);
});

Deno.test("cache key is a stable unicode-safe SHA-256 over the normalized input", async () => {
  const a = await imageSearchCacheKey(baseInput);
  const b = await imageSearchCacheKey({ ...baseInput, name: "  fair oaks   community FRIDGE " });
  assertEquals(a, b); // normalization: trim/collapse/lowercase
  assertEquals(a.startsWith("imageSearch:"), true);
  assertEquals(a.length, "imageSearch:".length + 64);
  const unicode = await imageSearchCacheKey({ ...baseInput, name: "社区冰箱 Café" });
  assertEquals(unicode.startsWith("imageSearch:"), true); // btoa would throw here
  const different = await imageSearchCacheKey({ ...baseInput, post_type: "foodbank" });
  assertEquals(a === different, false);
});

// =============================================================================
// SERP call contract
// =============================================================================

Deno.test("search hits serpapi google_images, caps at 10 and returns provenance", async () => {
  const calls: string[] = [];
  const send = ((input: string | URL | Request) => {
    calls.push(String(input));
    return Promise.resolve(
      Response.json({ images_results: Array.from({ length: 15 }, (_, i) => serpImage(i)) }),
    );
  }) as typeof fetch;
  let limited = 0;
  const deps: ImageSearchDeps = {
    apiKey: "test-serp-key",
    fetch: send,
    checkLimit: () => {
      limited++;
      return allowLimit();
    },
  };
  const result = await imageSearch(
    { ...baseInput, name: "Cap Test Fridge" },
    stubSupabase(),
    deps,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0]);
  assertEquals(url.hostname, "serpapi.com");
  assertEquals(url.pathname, "/search.json");
  assertEquals(url.searchParams.get("engine"), "google_images");
  assertEquals(url.searchParams.get("q"), "Cap Test Fridge community fridge Fair Oaks, CA");
  assertEquals(url.searchParams.get("tbs"), "itp:photo");
  assertEquals(url.searchParams.get("api_key"), "test-serp-key");
  assertEquals(result.candidates.length, 10);
  assertEquals(result.total_found, 15);
  assertEquals(result.scope, "name");
  assertEquals(result.cached, false);
  assertEquals(result.candidates[0].source_domain, "example0.org");
  assertEquals(limited, 1);
});

Deno.test("empty primary falls back once to the broader city+state query", async () => {
  const queries: string[] = [];
  const send = ((input: string | URL | Request) => {
    const q = new URL(String(input)).searchParams.get("q") ?? "";
    queries.push(q);
    return Promise.resolve(
      Response.json(
        queries.length === 1
          ? { images_results: [] }
          : { images_results: [serpImage(1), serpImage(2)] },
      ),
    );
  }) as typeof fetch;
  let limited = 0;
  const result = await imageSearch(
    { ...baseInput, name: "Fallback Test Fridge" },
    stubSupabase(),
    {
      apiKey: "test-serp-key",
      fetch: send,
      checkLimit: () => {
        limited++;
        return allowLimit();
      },
    },
  );
  assertEquals(queries, [
    "Fallback Test Fridge community fridge Fair Oaks, CA",
    "community fridge Fair Oaks, CA",
  ]);
  assertEquals(result.scope, "location");
  assertEquals(result.query, "community fridge Fair Oaks, CA");
  assertEquals(result.candidates.length, 2);
  assertEquals(limited, 2); // each SERP call consumes its own budget slot
});

Deno.test("no location: empty result is a value, not an error, and there is no fallback", async () => {
  let calls = 0;
  const send = (() => {
    calls++;
    return Promise.resolve(Response.json({ images_results: [] }));
  }) as typeof fetch;
  const result = await imageSearch(
    { name: "Lonely Fridge", post_type: "fridge" },
    stubSupabase(),
    { apiKey: "test-serp-key", fetch: send, checkLimit: allowLimit },
  );
  assertEquals(calls, 1);
  assertEquals(result.candidates, []);
  assertEquals(result.total_found, 0);
  assertEquals(result.scope, "name");
});

Deno.test("max_results is clamped into 1..10", async () => {
  const send = (() =>
    Promise.resolve(
      Response.json({ images_results: Array.from({ length: 15 }, (_, i) => serpImage(i)) }),
    )) as typeof fetch;
  const three = await imageSearch(
    { ...baseInput, name: "Clamp Three", max_results: 3 },
    stubSupabase(),
    { apiKey: "test-serp-key", fetch: send, checkLimit: allowLimit },
  );
  assertEquals(three.candidates.length, 3);
  const over = await imageSearch(
    { ...baseInput, name: "Clamp Over", max_results: 500 },
    stubSupabase(),
    { apiKey: "test-serp-key", fetch: send, checkLimit: allowLimit },
  );
  assertEquals(over.candidates.length, 10);
});

// =============================================================================
// Cache
// =============================================================================

Deno.test("database cache hit skips SERP entirely; second call hits memory", async () => {
  const stored: ImageSearchResult = {
    candidates: [{ url: "https://cdn.example.org/cached.jpg", source_domain: "example.org" }],
    query: "Cached Fridge community fridge Fair Oaks, CA",
    scope: "name",
    total_found: 1,
    cached: false,
  };
  const input = { ...baseInput, name: "Cached Fridge" };
  const key = await imageSearchCacheKey(input);
  const upserts: Record<string, unknown>[] = [];
  const supabase = stubSupabase({
    row: { result: stored, created_at: new Date().toISOString() },
    upserts,
  });
  let calls = 0;
  const send = (() => {
    calls++;
    return Promise.resolve(Response.json({ images_results: [] }));
  }) as typeof fetch;
  const deps: ImageSearchDeps = { apiKey: "test-serp-key", fetch: send, checkLimit: allowLimit };

  const first = await imageSearch(input, supabase, deps);
  assertEquals(first.cached, true);
  assertEquals(first.cache_source, "database");
  assertEquals(first.candidates, stored.candidates);
  assertEquals(calls, 0);
  assertEquals(upserts.length, 0); // a hit never rewrites the cache

  const second = await imageSearch(input, supabase, deps);
  assertEquals(second.cache_source, "memory");
  assertEquals(calls, 0);
  assertEquals(second.candidates, stored.candidates);
  assertEquals(key.startsWith("imageSearch:"), true);
});

Deno.test("cache miss writes the query-hash row fire-and-forget", async () => {
  const upserts: Record<string, unknown>[] = [];
  const send =
    (() => Promise.resolve(Response.json({ images_results: [serpImage(1)] }))) as typeof fetch;
  const input = { ...baseInput, name: "Write Cache Fridge" };
  const result = await imageSearch(input, stubSupabase({ upserts }), {
    apiKey: "test-serp-key",
    fetch: send,
    checkLimit: allowLimit,
  });
  assertEquals(result.cached, false);
  assertEquals(upserts.length, 1);
  assertEquals(upserts[0].cache_key, await imageSearchCacheKey(input));
  assertEquals(upserts[0].result, result);
});

// =============================================================================
// Rate limit + failure modes (fingerprint-only)
// =============================================================================

Deno.test("exhausted SERP budget rejects before any HTTP call", async () => {
  let calls = 0;
  const send = (() => {
    calls++;
    return Promise.resolve(Response.json({ images_results: [] }));
  }) as typeof fetch;
  await assertRejects(
    () =>
      imageSearch({ ...baseInput, name: "Budget Fridge" }, stubSupabase(), {
        apiKey: "test-serp-key",
        fetch: send,
        checkLimit: denyLimit,
      }),
    RateLimitError,
    "retry in 120s",
  );
  assertEquals(calls, 0);
});

Deno.test("missing credential fails closed without touching the network", async () => {
  let calls = 0;
  const send = (() => {
    calls++;
    return Promise.resolve(Response.json({ images_results: [] }));
  }) as typeof fetch;
  await assertRejects(
    () =>
      imageSearch({ ...baseInput, name: "No Key Fridge" }, stubSupabase(), {
        apiKey: "",
        fetch: send,
        checkLimit: allowLimit,
      }),
    ServerError,
    "SERPAPI_API_KEY is not configured",
  );
  assertEquals(calls, 0);
});

Deno.test("SERP failures map to typed errors and never echo the key", async () => {
  const key = "test-serp-secret-key";
  for (
    const [status, errType] of [
      [429, RateLimitError],
      [401, ServerError],
      [403, ServerError],
      [500, ServerError],
    ] as const
  ) {
    const send = (() =>
      Promise.resolve(new Response("upstream said " + key, { status }))) as typeof fetch;
    await assertRejects(
      () =>
        imageSearch({ ...baseInput, name: `Err ${status} Fridge` }, stubSupabase(), {
          apiKey: key,
          fetch: send,
          checkLimit: allowLimit,
        }),
      errType,
    );
  }
  // In-band error with HTTP 200 (account out of searches, invalid query, ...).
  const send200 = (() =>
    Promise.resolve(
      Response.json({ error: "Your account has run out of searches" }),
    )) as typeof fetch;
  await assertRejects(
    () =>
      imageSearch({ ...baseInput, name: "Inband Fridge" }, stubSupabase(), {
        apiKey: key,
        fetch: send200,
        checkLimit: allowLimit,
      }),
    ServerError,
    "SERP API",
  );
});

Deno.test("invalid input is rejected before any credential or network use", async () => {
  const deps: ImageSearchDeps = { apiKey: "test-serp-key", checkLimit: allowLimit };
  await assertRejects(
    () => imageSearch({ ...baseInput, name: "   " }, stubSupabase(), deps),
    ValidationError,
    "name is required",
  );
  await assertRejects(
    () =>
      imageSearch(
        { ...baseInput, name: "Bad Type", post_type: "food" as "fridge" },
        stubSupabase(),
        deps,
      ),
    ValidationError,
    "post_type",
  );
});

// =============================================================================
// Route auth (handler level)
// =============================================================================

const health = (() => Promise.resolve(new Response("healthy"))) as ReturnType<
  typeof createHealthHandler
>;
const handlers = createRouteHandlers(health);

function postCtx(
  headers: Record<string, string>,
  userId: string | null,
  body: PostBody = { name: "Route Fridge", city: "Fair Oaks", state: "CA", post_type: "fridge" },
): HandlerContext<PostBody> {
  return {
    request: new Request(
      "https://api.foodshare.club/functions/v1/api-v1-ai/inference/imageSearch",
      { method: "POST", headers },
    ),
    body,
    userId,
    supabase: stubSupabase() as unknown as HandlerContext<PostBody>["supabase"],
    corsHeaders: {},
  } as HandlerContext<PostBody>;
}

const headerSets: Record<string, string>[] = [
  {},
  { "x-supabase-cron": "true" },
  { authorization: "Bearer not-a-service-credential" },
];
for (const headers of headerSets) {
  Deno.test(`imageSearch rejects unauthenticated/forged caller ${JSON.stringify(headers)}`, async () => {
    await assertRejects(
      () => handlers.handlePost(postCtx(headers, null)),
      AuthenticationError,
    );
  });
}

Deno.test("imageSearch is service-only: a JWT user without service credentials is forbidden", async () => {
  await assertRejects(
    () => handlers.handlePost(postCtx({}, "user-123")),
    ForbiddenError,
  );
});

Deno.test("service caller reaches the provider and fails closed when the key is absent", async () => {
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  try {
    await assertRejects(
      () =>
        handlers.handlePost(
          postCtx({ authorization: "Bearer test-service-key" }, null),
        ),
      ServerError,
      "SERPAPI_API_KEY is not configured",
    );
  } finally {
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  }
});

Deno.test("service caller with a configured key gets the candidate envelope", async () => {
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  Deno.env.set("SERPAPI_API_KEY", "test-serp-key");
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json({ images_results: [serpImage(1)] }),
    )) as typeof fetch;
  try {
    const resp = await handlers.handlePost(
      postCtx({ authorization: "Bearer test-service-key" }, null, {
        name: "Happy Path Fridge",
        city: "Fair Oaks",
        state: "CA",
        post_type: "fridge",
      }),
    );
    assertEquals(resp.status, 200);
    const json = await resp.json();
    assertEquals(json.success, true);
    assertEquals(json.data.candidates.length, 1);
    assertEquals(json.data.candidates[0].source_domain, "example1.org");
    assertEquals(json.data.scope, "name");
    assertEquals(json.data.cached, false);
  } finally {
    globalThis.fetch = realFetch;
    Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    Deno.env.delete("SERPAPI_API_KEY");
  }
});
