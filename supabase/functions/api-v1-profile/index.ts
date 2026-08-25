/**
 * Profile API v1
 *
 * REST API for user profile operations.
 * Refactored into clean domain modules under lib/
 *
 * @module api-v1-profile
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { querySchema, uploadAvatarSchema } from "./lib/schemas.ts";
import { handleGet } from "./lib/handlers/get-profile.ts";
import { handlePut } from "./lib/handlers/update-profile.ts";
import { handlePost } from "./lib/handlers/avatar.ts";
import { handleDelete } from "./lib/handlers/account.ts";

Deno.serve(
  createAPIHandler({
    service: "api-v1-profile",
    version: "1.0.0",
    requireAuth: true,
    csrf: true,
    rateLimit: {
      limit: 60,
      windowMs: 60000,
      keyBy: "user",
    },
    routes: {
      GET: {
        querySchema,
        handler: handleGet,
      },
      PUT: {
        querySchema,
        handler: handlePut,
        idempotent: true,
      },
      POST: {
        schema: uploadAvatarSchema,
        querySchema,
        handler: handlePost,
        idempotent: true,
      },
      DELETE: {
        querySchema,
        handler: handleDelete,
      },
    },
  })
);
