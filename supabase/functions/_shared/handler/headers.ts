/**
 * Standard Response Headers
 *
 * X-Response-Time + X-RateLimit-* enrichment for edge responses.
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import type { RequestContext } from "../context.ts";

/**
 * Add X-Response-Time and rate limit headers to a response
 */
export function addStandardHeaders(
  response: Response,
  ctx: RequestContext,
  rateLimitInfo?: { limit: number; remaining: number; reset: number },
): void {
  // Response time
  const elapsed = Math.round(performance.now() - ctx.startTime);
  response.headers.set("X-Response-Time", `${elapsed}ms`);

  // Rate limit headers
  if (rateLimitInfo) {
    response.headers.set("X-RateLimit-Limit", String(rateLimitInfo.limit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, rateLimitInfo.remaining)),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(rateLimitInfo.reset / 1000)),
    );
  }
}
