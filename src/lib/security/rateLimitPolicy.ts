/**
 * When the proxy's rate limiters are required.
 *
 * The limiters in `src/proxy.ts` need Upstash Redis. Without it they are
 * `null`, every call site is guarded with `if (limiter && …)`, and the
 * result is a *silent* no-op: a production deploy missing
 * `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` ran with no rate
 * limiting at all and looked identical to one that was rate limiting.
 *
 * So a production deploy without Redis is answered with a 503 instead of
 * being allowed through unbounded. Failing closed is the right direction
 * for a control whose failure mode is "unlimited traffic": a brief 503 is
 * recoverable, an open door is not.
 *
 * Continuous integration is not a production deploy, and it is where the
 * distinction has to be drawn, because CI runs the production server:
 * `next start` sets `NODE_ENV` to "production", so a check on
 * `NODE_ENV` alone would arm the guard in the E2E job, which has no Redis
 * and does not need one. The Playwright web server waits for
 * `/api/ready` to answer before it starts the suite, so the guard would
 * not have failed an assertion -- it would have stopped every shard from
 * running at all, with a timeout and nothing to read.
 *
 * This lives in its own module so it can be tested without a server. The
 * proxy is a middleware file: importing it into a test would bring the
 * whole request path with it.
 */

export interface RateLimitEnvironment {
  NODE_ENV?: string;
  CI?: string;
}

/**
 * Whether a missing limiter is a misconfiguration that must be answered
 * with a 503, rather than a deployment that simply has no rate limiting.
 */
export function isRateLimitingRequired(env: RateLimitEnvironment): boolean {
  return env.NODE_ENV === "production" && env.CI !== "true";
}
