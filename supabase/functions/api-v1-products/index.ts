/**
 * Products API v1
 *
 * Unified REST API for product/listing operations.
 * Modularized architecture supporting Web, iOS, and Android clients.
 *
 * @module api-v1-products
 */

import { createAPIHandler } from "../_shared/api-handler.ts";
import { createProductSchema, listQuerySchema, updateProductSchema } from "./lib/schemas.ts";
import { handleGet } from "./lib/handlers/get-products.ts";
import { createProduct } from "./lib/handlers/create-product.ts";
import { updateProduct } from "./lib/handlers/update-product.ts";
import { deleteProduct } from "./lib/handlers/delete-product.ts";

Deno.serve(createAPIHandler({
  service: "api-v1-products",
  version: "2.0.0",
  requireAuth: false,
  csrf: true,
  rateLimit: {
    limit: 100,
    windowMs: 60000,
    keyBy: "ip",
    skip: (ctx) => ctx.request.method === "GET",
  },
  routes: {
    GET: {
      querySchema: listQuerySchema,
      handler: handleGet,
      requireAuth: false,
    },
    POST: {
      schema: createProductSchema,
      handler: createProduct,
      requireAuth: true,
      idempotent: true,
    },
    PUT: {
      schema: updateProductSchema,
      handler: updateProduct,
      requireAuth: true,
      idempotent: true,
    },
    DELETE: {
      handler: deleteProduct,
      requireAuth: true,
    },
  },
}));
