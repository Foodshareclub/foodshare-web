/**
 * Route-level auth regression for POST /inference/enrichListing (F2).
 *
 * enrichListing orchestrates the a1-first real-photo pipeline: it scrapes the
 * listing's own website and places real photographs on the post. Every other
 * pipeline route (imageSearch, enqueueEnrich, enrichListingQueue) is
 * service-auth only, and no client UI calls enrichListing — the only
 * production caller is the backfill script, which authenticates with the
 * service-role key. The route must therefore reject user-authenticated
 * callers (a user JWT lets any user target any post_id — the IDOR the F2
 * finding named) and keep accepting service credentials.
 */

import { assertEquals, assertRejects } from "@std/assert";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HandlerContext } from "../_shared/api-handler.ts";
import { AuthenticationError, ForbiddenError } from "../_shared/errors.ts";
import type { createHealthHandler } from "../_shared/health-handler.ts";
import { createRouteHandlers } from "../api-v1-ai/lib/handlers.ts";
import type { PostBody } from "../api-v1-ai/lib/schemas.ts";

const USER_JWT = "user-jwt-not-a-service-credential";
const CRON = "test-cron-secret";
const SERVICE_ROLE = "test-service-role-key";

async function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) Deno.env.delete(key);
    else Deno.env.set(key, value);
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

const health = (() => Promise.resolve(new Response("healthy"))) as ReturnType<
  typeof createHealthHandler
>;
const handlers = createRouteHandlers(health);

function ctx(
  headers: Record<string, string>,
  userId: string | null,
  body: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  supabase?: any,
): HandlerContext<PostBody> {
  const request = new Request(
    "https://api.foodshare.club/functions/v1/api-v1-ai/inference/enrichListing",
    { method: "POST", headers },
  );
  return {
    request,
    userId,
    body,
    headers: request.headers,
    corsHeaders: {},
    ...(supabase ? { supabase } : {}),
  } as unknown as HandlerContext<PostBody>;
}

/**
 * Stub supabase client: answers the route's service-path limiter, then fails
 * at the pipeline's first posts query with a marker — so a passing
 * service-auth call is observable as "the pipeline was reached" without any
 * database or network access.
 */
function pipelineEntrySupabase(): SupabaseClient {
  // deno-lint-ignore no-explicit-any
  return {
    rpc: async (name: string) => {
      if (name === "check_rate_limit") return { data: { allowed: true }, error: null };
      throw new Error(`unexpected rpc: ${name}`);
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: "pipeline entry reached" },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

Deno.test("enrichListing rejects a user-authenticated caller without service credentials", async () => {
  await withEnv({ CRON_SECRET: CRON, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE }, async () => {
    // The production deployment shape: both service secrets configured. A
    // user JWT is not a service credential, so the route must refuse before
    // any pipeline work — even for a post_id the user does not own.
    //
    // This context deliberately has no database client: without the guard the
    // route would sail past auth and die in the rate-limit RPC with a
    // TypeError, so a ForbiddenError here is proof the guard ran first.
    await assertRejects(
      () =>
        handlers.handlePost(
          ctx({ authorization: "Bearer " + USER_JWT }, "0d7f4e6a-1c2b-4a5d-9e8f-1234567890ab", {
            post_id: 1,
          }),
        ),
      ForbiddenError,
    );
  });
});

Deno.test("enrichListing rejects an anonymous caller", async () => {
  await withEnv({ CRON_SECRET: CRON, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE }, async () => {
    await assertRejects(
      () => handlers.handlePost(ctx({}, null, { post_id: 1 })),
      AuthenticationError,
    );
  });
});

Deno.test("enrichListing rejects a forged X-Supabase-Cron header from a user-authenticated caller", async () => {
  await withEnv({ CRON_SECRET: CRON, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE }, async () => {
    // A header the caller writes is not a credential.
    await assertRejects(
      () =>
        handlers.handlePost(
          ctx({ "x-supabase-cron": "true" }, "0d7f4e6a-1c2b-4a5d-9e8f-1234567890ab", {
            post_id: 1,
          }),
        ),
      ForbiddenError,
    );
  });
});

Deno.test("enrichListing still works for a cron-secret service caller", async () => {
  await withEnv({ CRON_SECRET: CRON, SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    const response = await handlers.handlePost(
      ctx({ "x-cron-secret": CRON }, null, { post_id: 1 }, pipelineEntrySupabase()),
    );
    assertEquals(response.status, 200);
    const payload = await response.json() as {
      success: boolean;
      data: { status: string; error: string };
    };
    // Auth passed, the service-path limiter passed, and the pipeline was
    // entered (the stub's marker, not an auth failure).
    assertEquals(payload.success, true);
    assertEquals(payload.data.status, "failed");
    assertEquals(payload.data.error, "pipeline entry reached");
  });
});

Deno.test("enrichListing still works for a service-role-key caller (the backfill credential form)", async () => {
  await withEnv({ CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE }, async () => {
    const response = await handlers.handlePost(
      ctx(
        { authorization: "Bearer " + SERVICE_ROLE },
        null,
        { post_id: 1 },
        pipelineEntrySupabase(),
      ),
    );
    assertEquals(response.status, 200);
    const payload = await response.json() as {
      success: boolean;
      data: { status: string; error: string };
    };
    assertEquals(payload.success, true);
    assertEquals(payload.data.status, "failed");
    assertEquals(payload.data.error, "pipeline entry reached");
  });
});
