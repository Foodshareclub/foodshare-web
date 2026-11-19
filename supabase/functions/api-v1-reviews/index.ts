/**
 * Reviews API v1
 *
 * REST API for user reviews after food exchanges.
 * Supports Web, iOS, and Android clients with consistent interface.
 *
 * Endpoints:
 * - GET    /api-v1-reviews?userId=<id>  - Get reviews for a user
 * - POST   /api-v1-reviews               - Submit a review
 *
 * Headers:
 * - Authorization: Bearer <jwt>
 * - X-Idempotency-Key: <uuid> (for POST)
 *
 * @module api-v1-reviews
 */

import { createAPIHandler, type HandlerContext } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { getReviews } from "./lib/handlers/get-reviews.ts";
import { submitReview } from "./lib/handlers/submit-review.ts";
import { type QueryParams, querySchema, submitReviewSchema } from "./lib/schemas.ts";

const VERSION = "1.0.0";
const healthCheck = createHealthHandler("api-v1-reviews", VERSION);

function handleGet(
  ctx: HandlerContext<unknown, QueryParams>,
): Promise<Response> {
  // Health check
  const url = new URL(ctx.request.url);
  if (url.pathname.endsWith("/health")) {
    return healthCheck(ctx);
  }

  return getReviews(ctx);
}

Deno.serve(createAPIHandler({
  service: "api-v1-reviews",
  version: "1.0.0",
  requireAuth: false, // GET is public, POST requires auth
  csrf: true,
  rateLimit: {
    limit: 30,
    windowMs: 60000,
    keyBy: "user",
    skip: (ctx) => ctx.request.method === "GET",
  },
  routes: {
    GET: {
      querySchema,
      handler: handleGet,
      requireAuth: false,
    },
    POST: {
      schema: submitReviewSchema,
      handler: submitReview,
      requireAuth: true,
      idempotent: true,
    },
  },
}));
