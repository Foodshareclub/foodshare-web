/**
 * Engagement API v1
 *
 * REST API for post engagement operations (likes, bookmarks, favorites, shares).
 * Supports Web, iOS, and Android clients with consistent interface.
 *
 * Endpoints:
 * - GET    /api-v1-engagement?postId=<id>           - Get engagement status
 * - GET    /api-v1-engagement?postIds=1,2,3         - Batch get engagement
 * - POST   /api-v1-engagement?action=like           - Toggle like
 * - POST   /api-v1-engagement?action=bookmark       - Toggle bookmark
 * - POST   /api-v1-engagement?action=favorite       - Toggle favorite (atomic)
 * - POST   /api-v1-engagement?action=share          - Record share
 * - POST   /api-v1-engagement/batch                 - Batch operations
 * - GET    /api-v1-engagement?action=bookmarks      - Get user's bookmarks
 *
 * Headers:
 * - Authorization: Bearer <jwt>
 *
 * @module api-v1-engagement
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { querySchema } from "./lib/schemas.ts";
import { createRouteHandlers } from "./lib/handlers/index.ts";

const VERSION = "1.0.0";
const healthCheck = createHealthHandler("api-v1-engagement", VERSION);
const { handleGet, handlePost } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-engagement",
  version: "1.0.0",
  requireAuth: false, // GET is public, POST requires auth for most actions
  csrf: true,
  rateLimit: {
    limit: 120,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      querySchema,
      handler: handleGet,
      requireAuth: false,
    },
    POST: {
      querySchema,
      handler: handlePost,
      requireAuth: true,
    },
  },
}));
