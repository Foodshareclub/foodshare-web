/**
 * Unified Validation API v1
 *
 * Enterprise-grade validation API consolidating ALL validation operations:
 * - Listings: Title, description, quantity, expiration
 * - Profiles: Nickname, bio
 * - Reviews: Rating, comment
 * - Email: Format validation
 * - Password: Strength evaluation
 *
 * Routes:
 * - GET    /health           - Health check
 * - GET    /rules            - Get validation rules (for client sync)
 * - POST   /listing          - Validate listing
 * - POST   /profile          - Validate profile
 * - POST   /review           - Validate review
 * - POST   /email            - Validate email
 * - POST   /password         - Validate password with strength
 * - POST   /batch            - Batch validate multiple entities
 *
 * No authentication required - validation is idempotent and stateless.
 *
 * @module api-v1-validation
 * @version 1.0.0
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { handleGet, handlePost, SERVICE, VERSION } from "./lib/handlers.ts";

Deno.serve(createAPIHandler({
  service: SERVICE,
  version: VERSION,
  requireAuth: false,
  csrf: false,
  rateLimit: {
    limit: 60,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: { handler: handleGet },
    POST: { handler: handlePost },
  },
}));
