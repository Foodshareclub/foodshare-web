/**
 * enrichListing — the host-listing city/state read (posts has no city/state
 * columns; the community_fridges host carries them) and the a1-first /
 * operator-gated-a2 tier order, pinned by the place-cover merge (t_d12b4ce9).
 */
import { assert, assertEquals, assertRejects } from "@std/assert";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { RateLimitError } from "../_shared/errors.ts";
import type { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "../api-v1-ai/lib/handlers.ts";
import { enrichListing } from "../api-v1-ai/lib/providers/image-pipeline.ts";
import type { PostBody } from "../api-v1-ai/lib/schemas.ts";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  return fn().finally(() => {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  });
}

interface SelectLog {
  [table: string]: string[];
}

function stubSupabase(
  post: Record<string, unknown>,
  fridge: Record<string, unknown> | null,
  selects: SelectLog,
) {
  return {
    from(table: string) {
      return {
        select(cols: string) {
          (selects[table] ??= []).push(cols);
          if (table === "posts") {
            return {
              eq: () => ({ single: () => Promise.resolve({ data: post, error: null }) }),
            };
          }
          if (table === "community_fridges") {
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: fridge, error: null }),
              }),
            };
          }
          throw new Error(`unexpected table: ${table}`);
        },
      };
    },
  };
}

const basePost = {
  id: 7,
  post_name: "Parnell Community Fridge",
  post_address: "1 Main St, Auckland",
  post_type: "fridge",
  fridge_id: 42,
  website: null,
  metadata: null,
  images: [],
};

Deno.test("enrichListing: city/state come from the host listing, not posts", async () => {
  const selects: SelectLog = {};
  const supabase = stubSupabase(basePost, { city: "Auckland", state: "Auckland" }, selects);
  await withEnv({ ALLOW_SERP_FALLBACK: undefined }, async () => {
    const result = await enrichListing({ post_id: 7 }, supabase, {
      createCover: () => Promise.reject(new Error("reference provider unavailable")),
    });
    assertEquals(result.status, "fell_through");
    assertEquals(selects.posts[0].includes("fridge_id"), true);
    assertEquals(selects.posts[0].includes("website"), true);
    assertEquals(selects.posts[0].includes("city"), false);
    assertEquals(selects.posts[0].includes("state"), false);
    // The provenance engine (close criterion (b)) and the EXIF-GPS tie
    // (architect addendum) extend the host select beyond city/state.
    const cfSelect = selects.community_fridges[0];
    for (const col of ["city", "state", "host_company", "latitude", "longitude"]) {
      assertEquals(cfSelect.includes(col), true, `community_fridges select must include ${col}`);
    }
    assertEquals(result.error?.includes("a2 gated"), true);
  });
});

Deno.test("enrichListing: a1 scrape runs before the gated a2 tier", async () => {
  const selects: SelectLog = {};
  // Stubbed DNS: the SSRF primitive resolves before fetching; the private
  // resolution makes a1Scrape fail-closed hermetically (no network, no
  // fetch), so the a1→a2 ordering and the consent-gate decision are
  // observable on their own.
  const website = "https://ownsite.example";
  const PRIVATE_IP = "10.2.3.4";
  const supabase = stubSupabase({ ...basePost, website }, null, selects);
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  // Indirect reference: the repo tsrs shim's Deno surface lacks resolveDns.
  // Deno resolveDns resolves to string[] (addresses), not record objects.
  const deno = Deno as unknown as {
    resolveDns?: (_name: string, _type: "A" | "AAAA") => Promise<string[]>;
  };
  const originalDns = deno.resolveDns;
  deno.resolveDns =
    ((_name: string, _type: "A" | "AAAA") =>
      Promise.resolve(_type === "A" ? [PRIVATE_IP] : [])) as NonNullable<typeof deno.resolveDns>;
  globalThis.fetch = ((input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    urls.push(url);
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  try {
    await withEnv({ ALLOW_SERP_FALLBACK: undefined }, async () => {
      const result = await enrichListing({ post_id: 7 }, supabase, {
        createCover: () => Promise.reject(new Error("reference provider unavailable")),
      });
      assertEquals(result.status, "fell_through");
      assertEquals(urls, []);
      assertEquals(result.error?.includes("a2 gated"), true);
    });
  } finally {
    globalThis.fetch = originalFetch;
    deno.resolveDns = originalDns;
  }
});

// =============================================================================
// Route (handler level) — the service-path rate-limit line
//
// The estate suite otherwise calls the provider directly and bypasses the
// handler's limiter line, so a broken limiter is only catchable here, at the
// route: the round-1 defect was a string key through the uuid-typed
// user-quota RPC (22P02 on every request → fail-closed → the route dead on
// arrival, the consent-gated backfill unable to run at all).
// =============================================================================

const health = (() => Promise.resolve(new Response("healthy"))) as ReturnType<
  typeof createHealthHandler
>;
const routeHandlers = createRouteHandlers(health);

interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

function enrichRouteCtx(
  rpcImpl: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>,
  rpcCalls: RpcCall[],
  flags: { postsTouched: boolean },
  body: Record<string, unknown> = { post_id: 7 },
): HandlerContext<PostBody> {
  return {
    request: new Request(
      "https://api.foodshare.club/functions/v1/api-v1-ai/inference/enrichListing",
      { method: "POST", headers: { authorization: "Bearer test-service-key" } },
    ),
    body: body as unknown as PostBody,
    userId: null,
    supabase: {
      rpc: (name: string, args: Record<string, unknown>) => {
        rpcCalls.push({ name, args });
        return rpcImpl(name, args);
      },
      // The pipeline's first action is a posts select: if the route reaches
      // here, the limiter allowed it (and the defect — the rpc call itself —
      // is the one under test).
      from: (table: string) => {
        if (table === "posts") {
          flags.postsTouched = true;
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    // Stop at the database boundary: limiter tests must not
                    // depend on a pretend stored image being publicly readable.
                    data: null,
                    error: null,
                  }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      },
    } as unknown as HandlerContext<PostBody>["supabase"],
    corsHeaders: {},
  } as HandlerContext<PostBody>;
}

const ROUTE_ENV = {
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  ALLOW_SERP_FALLBACK: undefined,
} as const;

Deno.test("enrichListing route: within budget it succeeds on the string-key limiter", async () => {
  await withEnv({ ...ROUTE_ENV }, async () => {
    const rpcCalls: RpcCall[] = [];
    const flags = { postsTouched: false };
    const resp = await routeHandlers.handlePost(
      enrichRouteCtx(
        (name, args) => {
          assertEquals(name, "check_rate_limit");
          assertEquals(args, {
            p_key: "service-enrich-7",
            p_limit: 30,
            p_window_ms: 60_000,
          });
          return Promise.resolve({
            data: {
              allowed: true,
              remaining: 29,
              reset_at: Date.now() + 60_000,
              retry_after_ms: 0,
            },
            error: null,
          });
        },
        rpcCalls,
        flags,
      ),
    );
    assertEquals(resp.status, 200);
    const json = (await resp.json()) as { success: boolean; data: { status: string } };
    assertEquals(json.success, true);
    assertEquals(json.data.status, "failed"); // controlled missing post; no provider request
    assertEquals(flags.postsTouched, true, "the pipeline ran after the allow");
    // Round-1 defect regression: the route rides the string-key distributed
    // limiter — never the uuid-typed user-quota RPC, where a string key is a
    // 22P02 cast error on every request.
    assertEquals(rpcCalls.length, 1);
    assertEquals(rpcCalls[0].name, "check_rate_limit");
    assert(typeof rpcCalls[0].args.p_key === "string");
  });
});

Deno.test("enrichListing route: an exhausted budget rejects before the pipeline runs", async () => {
  await withEnv({ ...ROUTE_ENV }, async () => {
    const rpcCalls: RpcCall[] = [];
    const flags = { postsTouched: false };
    await assertRejects(
      () =>
        routeHandlers.handlePost(
          enrichRouteCtx(
            () =>
              Promise.resolve({
                data: {
                  allowed: false,
                  remaining: 0,
                  reset_at: Date.now() + 30_000,
                  retry_after_ms: 30_000,
                },
                error: null,
              }),
            rpcCalls,
            flags,
          ),
        ),
      RateLimitError,
      "Rate limit exceeded on enrichListing",
    );
    assertEquals(flags.postsTouched, false, "the pipeline never ran");
    assertEquals(rpcCalls.length, 1, "exactly one limiter call, then the reject");
  });
});

Deno.test("enrichListing route: a limiter RPC error fails closed (blocked, never unthrottled)", async () => {
  await withEnv({ ...ROUTE_ENV }, async () => {
    const rpcCalls: RpcCall[] = [];
    const flags = { postsTouched: false };
    await assertRejects(
      () =>
        routeHandlers.handlePost(
          enrichRouteCtx(
            () =>
              Promise.resolve({
                data: null,
                error: { message: "22P02: invalid input syntax for type uuid" },
              }),
            rpcCalls,
            flags,
          ),
        ),
      RateLimitError,
      "Rate limit exceeded on enrichListing",
    );
    assertEquals(flags.postsTouched, false, "an unavailable limiter is not an unlimited one");
    assertEquals(rpcCalls[0].name, "check_rate_limit");
  });
});

Deno.test("enrichListing route: a non-verdict (scalar) payload fails closed", async () => {
  // check_rate_limit is overloaded in PostgreSQL; a wrong overload resolution
  // could return a bare boolean. Only the JSONB sliding-window verdict is an
  // allow — everything else blocks.
  await withEnv({ ...ROUTE_ENV }, async () => {
    const rpcCalls: RpcCall[] = [];
    const flags = { postsTouched: false };
    await assertRejects(
      () =>
        routeHandlers.handlePost(
          enrichRouteCtx(
            () => Promise.resolve({ data: true, error: null }),
            rpcCalls,
            flags,
          ),
        ),
      RateLimitError,
      "Rate limit exceeded on enrichListing",
    );
    assertEquals(flags.postsTouched, false);
  });
});

for (const postType of ["food", "fridge", "foodbank"]) {
  for (const conflict of [false, true]) {
    Deno.test(`enrichListing: ${postType} reference cover ${conflict ? "cannot overwrite concurrent edits" : "preserves photos and metadata"}`, async () => {
      const original =
        "https://api.foodshare.club/storage/v1/object/public/posts/owner/original.jpg";
      const generated =
        "https://api.foodshare.club/storage/v1/object/public/food-images/owner/cover.jpg";
      const newer = "https://api.foodshare.club/storage/v1/object/public/posts/owner/newer.jpg";
      const state = {
        id: 7,
        version: 12,
        profile_id: "owner",
        post_type: postType,
        post_name: "Apples",
        post_description: "Garden apples",
        images: postType === "food" ? [original] : [],
        metadata: { owner_note: "keep" },
      };
      const filters: Record<string, unknown> = {};
      let writes = 0;
      const supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: structuredClone(state), error: null }),
            }),
          }),
          update: (patch: { images: string[]; metadata: typeof state.metadata }) => {
            const query = {
              eq: (key: string, value: unknown) => {
                filters[key] = value;
                return query;
              },
              select: () => query,
              single: () => {
                if (filters.id !== state.id || filters.version !== state.version) {
                  return Promise.resolve({ data: null, error: { message: "version conflict" } });
                }
                writes++;
                Object.assign(state, patch);
                return Promise.resolve({ data: { id: state.id }, error: null });
              },
            };
            return query;
          },
        }),
      };
      const result = await enrichListing({ post_id: 7 }, supabase, {
        createCover: () => {
          if (conflict) {
            state.version++;
            state.images = [newer];
            state.metadata.owner_note = "updated during generation";
          }
          return Promise.resolve({
            images: [generated],
            cover: {
              kind: "generated" as const,
              provider: "zai" as const,
              model: "glm-image",
              contextHash: "test-context",
              matchedAt: "2026-11-26T00:00:00Z",
              query: "listing subject",
              matchScope: "subject" as const,
              disclosure: "AI-generated illustration; not a photograph of the listed item",
            },
          });
        },
      });
      assertEquals(filters, { id: 7, version: 12 });
      assertEquals(result.status, conflict ? "fell_through" : "placed");
      if (conflict) assertEquals(result.error, "cover persistence: version conflict");
      assertEquals(writes, conflict ? 0 : 1);
      assertEquals(
        state.images,
        conflict ? [newer] : postType === "food" ? [generated, original] : [generated],
      );
      assertEquals(state.metadata.owner_note, conflict ? "updated during generation" : "keep");
      if (!conflict) {
        const metadata = state.metadata as Record<string, unknown>;
        assertEquals((metadata.cover as Record<string, unknown>).kind, "generated");
        assertEquals(
          (metadata.cover as Record<string, unknown>).disclosure,
          "AI-generated illustration; not a photograph of the listed item",
        );
      }
    });
  }
}
