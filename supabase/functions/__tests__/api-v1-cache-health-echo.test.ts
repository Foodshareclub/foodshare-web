/**
 * api-v1-cache health-endpoint echo tests.
 *
 * Ruling (2026-11-13, @cybersecurity, adopted by @lead): a health endpoint
 * must not echo service response content even when gated. The F4 token gate
 * (`?check=services`, `?check=health`) restricts who can ask, not what the
 * answer may contain — and the answer previously carried the raw
 * Upstash/QStash payload (`details`): through QStash's `/v2/schedules` that
 * is the full schedule inventory (callback endpoints, intervals), and the
 * Vector/Search live vector counts. The verbatim error text was pinned to a
 * fixed message in the same pass as defense-in-depth — the canonical fetch
 * failure is host-free today (the URL lives in `error.cause`, which is never
 * serialized), and these tests prove the body stays host-free even in a
 * failure mode whose message does carry the URL.
 *
 * This pins the stripped contract for both diagnostic checks, configured and
 * unconfigured: no instance host, no token, no raw service payload anywhere
 * in the response body, and the service messages reduced to the fixed
 * validator strings.
 *
 * The stub is installed on `globalThis.fetch` because `handleGetRequest`
 * builds its own service-role client internally and `@supabase/supabase-js`
 * issues its RPC calls through the same global — one stub therefore covers
 * the Vault reads and the service calls alike, with no network access.
 *
 * Two cross-file hazards, both handled here because `DENO_JOBS=1` runs every
 * test file in this one process:
 *  - the Vault secret cache has a 5-minute TTL and no reset; the stub
 *    answers `get_vault_secret` with a non-`PGRST116` error so the
 *    environment fallback is taken and nothing is cached for later files;
 *  - the service-role client is a module singleton, reset around each test
 *    so files that run after this one re-derive it from their own env.
 */
import { assert, assertEquals } from "@std/assert";

import { type HandlerContext } from "../_shared/api-handler.ts";
import { resetSupabaseClient } from "../_shared/supabase.ts";
import { handleGetRequest } from "../api-v1-cache/lib/health.ts";

// --- fixtures ----------------------------------------------------------------

const INTERNAL_SECRET = "test-internal-service-secret-0123456789abcdef";
const FAKE_SUPABASE_URL = "http://vault-stub.test:54321";
const SERVICE_ROLE_KEY = "test-service-role-key-not-a-real-secret";

const SVC_REDIS_URL = "https://svc-redis.upstash.io";
const SVC_REDIS_TOKEN = "svc-redis-token-must-not-leak";
const SVC_VECTOR_URL = "https://svc-vector.upstash.io";
const SVC_VECTOR_TOKEN = "svc-vector-token-must-not-leak";
const SVC_QSTASH_URL = "https://svc-qstash.upstash.io";
const SVC_QSTASH_TOKEN = "svc-qstash-token-must-not-leak";
const SVC_SEARCH_URL = "https://svc-search.upstash.io";
const SVC_SEARCH_TOKEN = "svc-search-token-must-not-leak";

const REDIS_URL = "https://detailed-redis.upstash.io";
const REDIS_TOKEN = "detailed-redis-token-must-not-leak";

// A value that exists only inside the stubbed service responses. If it
// appears in a response body, the raw service payload was echoed.
const MARKER = "RAW_SERVICE_PAYLOAD_MARKER";

const ALL_FORBIDDEN = [
  SVC_REDIS_URL,
  SVC_REDIS_TOKEN,
  SVC_VECTOR_URL,
  SVC_VECTOR_TOKEN,
  SVC_QSTASH_URL,
  SVC_QSTASH_TOKEN,
  SVC_SEARCH_URL,
  SVC_SEARCH_TOKEN,
  REDIS_URL,
  REDIS_TOKEN,
  MARKER,
];

// --- stub --------------------------------------------------------------------

type EndpointBehavior =
  | { kind: "json"; body: unknown; status?: number }
  | { kind: "reject"; error: Error };

interface Scenario {
  /** Rows returned by the `get_secrets` Vault RPC. */
  secrets: Array<{ name: string; value: string }>;
  /** Values returned by the `get_secret_audited` Vault RPC, by secret name. */
  audited: Record<string, string>;
  /** Behavior for direct service fetches, keyed by full URL, by request body. */
  endpoints: Record<string, (body: string | null) => EndpointBehavior>;
}

let scenario: Scenario = { secrets: [], audited: {}, endpoints: {} };

const jsonResponse = (body: unknown, status = 200): EndpointBehavior => ({
  kind: "json",
  body,
  status,
});

const networkFailure = (url: string): EndpointBehavior => ({
  kind: "reject",
  error: new Error(`network error reaching ${url}`),
});

function stubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
    ? input.href
    : input.url;

  if (url.includes("/rest/v1/rpc/get_vault_secret")) {
    // A non-PGRST116 error: getSecret() falls back to Deno.env without
    // writing the value into the 5-minute Vault cache, so this file's
    // secret never outlives it.
    return Promise.resolve(
      Response.json(
        { code: "PGRST500", message: "vault unavailable in test", details: "", hint: "" },
        { status: 500 },
      ),
    );
  }
  if (url.includes("/rest/v1/rpc/get_secrets")) {
    return Promise.resolve(Response.json(scenario.secrets));
  }
  if (url.includes("/rest/v1/rpc/get_secret_audited")) {
    const params = JSON.parse(String(init?.body ?? "{}")) as { secret_name?: string };
    const value = params.secret_name ? scenario.audited[params.secret_name] : undefined;
    if (value === undefined) {
      return Promise.resolve(
        Response.json(
          { code: "PGRST500", message: "secret unavailable in test", details: "", hint: "" },
          { status: 500 },
        ),
      );
    }
    return Promise.resolve(Response.json(value));
  }

  const endpoint = scenario.endpoints[url];
  if (!endpoint) {
    return Promise.reject(new Error(`stubFetch: unexpected URL ${url}`));
  }
  const body = init?.body === undefined || init.body === null ? null : String(init.body);
  const behavior = endpoint(body);
  if (behavior.kind === "reject") return Promise.reject(behavior.error);
  return Promise.resolve(Response.json(behavior.body, { status: behavior.status ?? 200 }));
}

// --- test harness ------------------------------------------------------------

const ENV_NAMES = [
  "INTERNAL_SERVICE_SECRET",
  "WEBHOOK_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

async function withTestEnv(fn: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>(
    ENV_NAMES.map((name) => [name, Deno.env.get(name)]),
  );
  const realFetch = globalThis.fetch;
  globalThis.fetch = stubFetch as typeof fetch;
  Deno.env.set("INTERNAL_SERVICE_SECRET", INTERNAL_SECRET);
  Deno.env.set("SUPABASE_URL", FAKE_SUPABASE_URL);
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE_KEY);
  resetSupabaseClient();
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
    resetSupabaseClient();
  }
}

function makeCtx(check: string): HandlerContext {
  const request = new Request(
    `https://api.example.test/functions/v1/api-v1-cache?check=${check}`,
    { method: "GET", headers: { authorization: `Bearer ${INTERNAL_SECRET}` } },
  );
  return { request, corsHeaders: {} } as unknown as HandlerContext;
}

function assertNoEcho(bodyText: string, forbidden: string[]): void {
  for (const value of forbidden) {
    assert(
      !bodyText.includes(value),
      `response body must not contain ${JSON.stringify(value)}; body: ${bodyText.slice(0, 500)}`,
    );
  }
}

// --- response shapes (the wrapper is { success, data, meta }) -----------------

interface ServiceResult {
  service: string;
  status: string;
  message: string;
  responseTime?: number;
  skipped?: boolean;
  details?: unknown;
}

interface ServicesBody {
  success: boolean;
  data: {
    success: boolean;
    summary: {
      total: number;
      healthy: number;
      unhealthy: number;
      skipped: number;
      avgResponseTime: number;
    };
    results: ServiceResult[];
    version: string;
    timestamp: string;
  };
}

interface HealthCheck {
  status: string;
  value: string | number;
  message: string;
}

interface HealthBody {
  success: boolean;
  data: {
    status: string;
    error?: string;
    reason?: string;
    checks?: Record<string, HealthCheck>;
    metrics?: { redis: Record<string, unknown>; performance: Record<string, unknown> };
    alerts?: Array<{ severity: string; component: string; message: string }>;
    version: string;
    timestamp: string;
  };
}

// --- ?check=services -----------------------------------------------------------

Deno.test("services (unconfigured): skips are reported without echoing placeholder hosts", async () => {
  await withTestEnv(async () => {
    // One service carries the template's placeholder values — the estate's
    // real "configured but not" shape — the other three are absent.
    scenario = {
      secrets: [
        { name: "UPSTASH_REDIS_REST_URL", value: "https://your-instance.upstash.io" },
        { name: "UPSTASH_REDIS_REST_TOKEN", value: "your-upstash-rest-token" },
      ],
      audited: {},
      endpoints: {},
    };

    const response = await handleGetRequest(makeCtx("services"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as ServicesBody;

    assertEquals(body.data.results.length, 4);
    for (const result of body.data.results) {
      assertEquals(result.skipped, true, `${result.service} must be skipped`);
      assertEquals(result.status, "ok");
    }
    assertEquals(body.data.summary.skipped, 4);
    assertEquals(body.data.summary.unhealthy, 0);
    assertNoEcho(bodyText, ["upstash.io", "your-instance", "your-upstash"]);
  });
});

Deno.test("services (configured, ok): no raw payload, no host, no token, fixed messages", async () => {
  await withTestEnv(async () => {
    scenario = {
      secrets: [
        { name: "UPSTASH_REDIS_REST_URL", value: SVC_REDIS_URL },
        { name: "UPSTASH_REDIS_REST_TOKEN", value: SVC_REDIS_TOKEN },
        { name: "UPSTASH_VECTOR_REST_URL", value: SVC_VECTOR_URL },
        { name: "UPSTASH_VECTOR_REST_TOKEN", value: SVC_VECTOR_TOKEN },
        { name: "QSTASH_URL", value: SVC_QSTASH_URL },
        { name: "QSTASH_TOKEN", value: SVC_QSTASH_TOKEN },
        { name: "UPSTASH_SEARCH_REST_URL", value: SVC_SEARCH_URL },
        { name: "UPSTASH_SEARCH_REST_TOKEN", value: SVC_SEARCH_TOKEN },
      ],
      audited: {},
      endpoints: {
        [`${SVC_REDIS_URL}/ping`]: () =>
          jsonResponse({ result: "PONG", metadata: { marker: MARKER } }),
        [`${SVC_VECTOR_URL}/info`]: () =>
          jsonResponse({ result: { vectorCount: 3, marker: MARKER } }),
        [`${SVC_QSTASH_URL}/v2/schedules`]: () =>
          jsonResponse([{ id: "sched-1", marker: MARKER }]),
        [`${SVC_SEARCH_URL}/info`]: () =>
          jsonResponse({ result: { vectorCount: 7, marker: MARKER } }),
      },
    };

    const response = await handleGetRequest(makeCtx("services"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as ServicesBody;

    const byName = new Map(body.data.results.map((r) => [r.service, r]));
    // The validator messages are the only service-derived strings allowed in
    // the body — pin them exactly, so one cannot grow a URL or a token.
    assertEquals(byName.get("Redis")?.message, "PING successful");
    assertEquals(byName.get("Vector")?.message, "Vector DB ready (3 vectors)");
    assertEquals(byName.get("QStash")?.message, "QStash accessible (1 schedules)");
    assertEquals(byName.get("Search")?.message, "Search ready (7 vectors)");

    for (const result of body.data.results) {
      assertEquals(result.status, "ok", `${result.service} must report ok`);
      assert(!("details" in result), `${result.service} must not carry the raw service payload`);
      assertEquals(typeof result.responseTime, "number");
    }
    assertEquals(body.data.summary.healthy, 4);
    assertNoEcho(bodyText, ALL_FORBIDDEN);
  });
});

Deno.test("services (configured, unreachable): the fetch error is logged, never echoed", async () => {
  await withTestEnv(async () => {
    scenario = {
      secrets: [
        { name: "UPSTASH_REDIS_REST_URL", value: SVC_REDIS_URL },
        { name: "UPSTASH_REDIS_REST_TOKEN", value: SVC_REDIS_TOKEN },
        { name: "UPSTASH_VECTOR_REST_URL", value: SVC_VECTOR_URL },
        { name: "UPSTASH_VECTOR_REST_TOKEN", value: SVC_VECTOR_TOKEN },
        { name: "QSTASH_URL", value: SVC_QSTASH_URL },
        { name: "QSTASH_TOKEN", value: SVC_QSTASH_TOKEN },
        { name: "UPSTASH_SEARCH_REST_URL", value: SVC_SEARCH_URL },
        { name: "UPSTASH_SEARCH_REST_TOKEN", value: SVC_SEARCH_TOKEN },
      ],
      audited: {},
      endpoints: {
        [`${SVC_REDIS_URL}/ping`]: () => networkFailure(`${SVC_REDIS_URL}/ping`),
        [`${SVC_VECTOR_URL}/info`]: () => networkFailure(`${SVC_VECTOR_URL}/info`),
        [`${SVC_QSTASH_URL}/v2/schedules`]: () => networkFailure(`${SVC_QSTASH_URL}/v2/schedules`),
        [`${SVC_SEARCH_URL}/info`]: () => networkFailure(`${SVC_SEARCH_URL}/info`),
      },
    };

    const response = await handleGetRequest(makeCtx("services"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as ServicesBody;

    for (const result of body.data.results) {
      assertEquals(result.status, "error", `${result.service} must report error`);
      assertEquals(
        result.message,
        "Connection/check failed",
        `${result.service} must use the fixed failure message, not the error text`,
      );
    }
    assertEquals(body.data.summary.unhealthy, 4);
    assertEquals(body.data.success, false);
    assertNoEcho(bodyText, ALL_FORBIDDEN);
  });
});

// --- ?check=health (detailed Redis check) ---------------------------------------

Deno.test("health (unconfigured): a fixed not_configured body", async () => {
  await withTestEnv(async () => {
    scenario = { secrets: [], audited: {}, endpoints: {} };

    const response = await handleGetRequest(makeCtx("health"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as HealthBody;

    assertEquals(body.data.status, "not_configured");
    assertNoEcho(bodyText, [REDIS_URL, REDIS_TOKEN, "upstash.io"]);
  });
});

Deno.test("health (unreachable redis): the connection error is logged, never echoed", async () => {
  await withTestEnv(async () => {
    scenario = {
      secrets: [],
      audited: { UPSTASH_REDIS_URL: REDIS_URL, UPSTASH_REDIS_TOKEN: REDIS_TOKEN },
      // PING and all four INFO reads hit the same URL.
      endpoints: {
        [REDIS_URL]: () => networkFailure(REDIS_URL),
      },
    };

    const response = await handleGetRequest(makeCtx("health"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as HealthBody;

    const connectivity = body.data.checks?.connectivity;
    assertEquals(connectivity?.status, "fail");
    assertEquals(
      connectivity?.message,
      "Connection failed",
      "the connectivity check must use the fixed message, not the error text",
    );
    assertEquals(body.data.alerts?.[0]?.message, "Redis connection failure");
    assertNoEcho(bodyText, [REDIS_URL, REDIS_TOKEN, MARKER]);
  });
});

Deno.test("health (healthy redis): only operational metrics, no host, token or payload", async () => {
  await withTestEnv(async () => {
    // The INFO text carries a marker line that no metrics field maps to —
    // if it reaches the body, raw service content was echoed.
    const infoText = [
      "# Stats",
      "keyspace_hits:900",
      "keyspace_misses:100",
      "evicted_keys:0",
      "# Memory",
      "used_memory:1048576",
      "used_memory_human:1.00M",
      "used_memory_peak_human:2.00M",
      "maxmemory:2097152",
      "# Clients",
      "connected_clients:3",
      "# Server",
      "uptime_in_seconds:12345",
      `leaked_info_line:${MARKER}`,
    ].join("\n");

    scenario = {
      secrets: [],
      audited: { UPSTASH_REDIS_URL: REDIS_URL, UPSTASH_REDIS_TOKEN: REDIS_TOKEN },
      endpoints: {
        [REDIS_URL]: (body) =>
          body === `["PING"]` ? jsonResponse({ result: "PONG" }) : jsonResponse({ result: infoText }),
      },
    };

    const response = await handleGetRequest(makeCtx("health"));
    assertEquals(response.status, 200);
    const bodyText = await response.text();
    const body = JSON.parse(bodyText) as HealthBody;

    assertEquals(body.data.status, "healthy");
    assertEquals(body.data.checks?.connectivity?.status, "pass");
    // Operational numbers are the allowed echo surface — verify they are the
    // ones derived from INFO, which is what the ruling preserves.
    assertEquals(body.data.metrics?.redis.keyspaceHits, 900);
    assertEquals(body.data.metrics?.redis.hitRate, 0.9);
    assertEquals(body.data.metrics?.redis.memoryUsed, "1.00M");
    assertNoEcho(bodyText, [REDIS_URL, REDIS_TOKEN, MARKER, "leaked_info_line"]);
  });
});
