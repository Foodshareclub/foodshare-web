/**
 * Validation Route Handlers (GET/POST dispatch)
 *
 * Extracted from `api-v1-validation/index.ts` — no logic changes.
 */

import { z } from "zod";
import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { ValidationError } from "../../_shared/errors.ts";
import { parseRoute } from "../../_shared/routing.ts";
import { VALIDATION } from "../../_shared/validation-rules.ts";
import {
  handleBatchValidation,
  handleValidateEmail,
  handleValidateListing,
  handleValidatePassword,
  handleValidateProfile,
  handleValidateReview,
} from "./validators.ts";

export const VERSION = "1.0.0";
export const SERVICE = "api-v1-validation";

export async function handleGet(ctx: HandlerContext): Promise<Response> {
  const route = parseRoute(
    new URL(ctx.request.url),
    ctx.request.method,
    SERVICE,
  );

  switch (route.resource) {
    case "health":
    case "":
      return ok({
        status: "healthy",
        version: VERSION,
        service: SERVICE,
        timestamp: new Date().toISOString(),
        endpoints: [
          "listing",
          "profile",
          "review",
          "email",
          "password",
          "batch",
          "rules",
        ],
      }, ctx);

    case "rules":
      return ok(
        {
          success: true,
          rules: VALIDATION,
          version: VERSION,
        },
        ctx,
        { cacheTTL: 3600 },
      );

    default:
      throw new ValidationError(`Not found: ${route.resource}`);
  }
}

export async function handlePost(ctx: HandlerContext): Promise<Response> {
  const route = parseRoute(
    new URL(ctx.request.url),
    ctx.request.method,
    SERVICE,
  );
  const body = ctx.body;

  try {
    switch (route.resource) {
      case "listing":
        return ok(handleValidateListing(body), ctx);
      case "profile":
        return ok(handleValidateProfile(body), ctx);
      case "review":
        return ok(handleValidateReview(body), ctx);
      case "email":
        return ok(handleValidateEmail(body), ctx);
      case "password":
        return ok(handleValidatePassword(body), ctx);
      case "batch":
        return ok(handleBatchValidation(body), ctx);
      default:
        throw new ValidationError(`Not found: ${route.resource}`);
    }
  } catch (error) {
    // Handle Zod validation errors as ValidationError
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        "Validation failed",
        error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      );
    }
    throw error;
  }
}
