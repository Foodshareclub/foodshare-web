/**
 * When a missing rate limiter is a misconfiguration.
 *
 * The proxy answers a request with a 503 when it is running in production
 * without the Redis the limiters need. That is the whole point of the
 * control: a production deploy with no rate limiting looks exactly like
 * one that is rate limiting unless it is made to say so.
 *
 * The case this file exists for is the other side of that. CI runs the
 * production server — `next start` sets `NODE_ENV` to "production" — and
 * it has no Redis, and does not need one. The guard was armed on
 * `NODE_ENV` alone, so the E2E job answered its readiness probe with a
 * 503. The Playwright web server waits for `/api/ready` before it starts
 * the suite, so no assertion ever ran: every shard timed out waiting for a
 * server that was answering "Service Unavailable".
 */

import { describe, expect, it } from "bun:test";
import { isRateLimitingRequired } from "@/lib/security/rateLimitPolicy";

describe("isRateLimitingRequired", () => {
  it("requires the limiters in production", () => {
    expect(isRateLimitingRequired({ NODE_ENV: "production" })).toBe(true);
  });

  it("does not require them in development", () => {
    expect(isRateLimitingRequired({ NODE_ENV: "development" })).toBe(false);
  });

  it("does not require them when NODE_ENV is unset", () => {
    expect(isRateLimitingRequired({})).toBe(false);
  });

  it("does not require them in CI, which runs the production server without Redis", () => {
    // The E2E job: `next start` under GitHub Actions. `NODE_ENV` is
    // "production" and there is no Redis, and the guard must stay out of
    // the way or the suite never starts.
    expect(isRateLimitingRequired({ NODE_ENV: "production", CI: "true" })).toBe(false);
  });

  it("still requires them in CI for anything but the exact 'true' the runner sets", () => {
    // A truthy value that is not the string the runner sets is not the
    // runner. Treating "1" or "yes" as CI would disarm the control on a
    // production host that happened to set one of them.
    expect(isRateLimitingRequired({ NODE_ENV: "production", CI: "1" })).toBe(true);
    expect(isRateLimitingRequired({ NODE_ENV: "production", CI: "" })).toBe(true);
  });
});
