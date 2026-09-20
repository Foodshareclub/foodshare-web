/**
 * API Handler Factory
 *
 * `createAPIHandler` — enterprise request pipeline (CORS, CSRF, auth,
 * validation, rate limiting, idempotency, versioning, observability).
 * Extracted from `_shared/api-handler.ts` — no logic changes.
 */

import { AppError, AuthenticationError, RateLimitError } from "../errors.ts";
import { buildErrorResponse, buildSuccessResponse } from "../response-adapter.ts";
import { logger } from "../logger.ts";
import { trackError } from "../error-tracking.ts";
import { checkMemoryUsage, clearSpans, getSpans, type Span, trackRequest } from "../performance.ts";
import { CsrfError, type CsrfOptions, validateCsrf } from "../csrf.ts";
import { checkDistributedRateLimit } from "../rate-limiter.ts";
import { getSecret, loadAllSecrets } from "../vault.ts";
import { clearContext, handleWithContext, setUserId } from "../context.ts";
import { getCorsHeaders, handleCorsPreflight } from "../cors.ts";
import { authenticateRequest } from "./auth.ts";
import { checkIdempotencyKey, storeIdempotencyKey } from "./idempotency.ts";
import { parseQueryParams, parseRequestBody } from "./body-parser.ts";
import { validateWithSchema } from "./validation.ts";
import { extractPathParams } from "./path-params.ts";
import { checkInMemoryRateLimit, getRateLimitKey } from "./rate-limit.ts";
import { addStandardHeaders } from "./headers.ts";
import { getRequestedVersion } from "./versioning.ts";
import { createSupabaseClient } from "./supabase-factory.ts";
import type { APIHandlerConfig, HandlerContext, HttpMethod } from "./types.ts";

// Global vault cache presence tracker
let vaultLoaded = false;

// Check memory usage at most once per 60 seconds (avoid syscall overhead)
let lastMemoryCheckTime = 0;

/**
 * Create an API handler with full enterprise features
 */
export function createAPIHandler(config: APIHandlerConfig) {
  const {
    service,
    requireAuth = true,
    version = "1",
    pathPattern,
    routes,
    rateLimit,
    checkRateLimit,
    additionalOrigins,
    supportedVersions: _supportedVersions,
    deprecatedVersions,
    csrf = true, // CSRF protection enabled by default
    maxBodySize,
  } = config;

  return handleWithContext(service, async (request, ctx): Promise<Response> => {
    const corsHeaders = getCorsHeaders(request, additionalOrigins);
    const perfTracker = trackRequest(service);

    // Ensure Vault is loaded (warm cache)
    if (!vaultLoaded) {
      try {
        await loadAllSecrets();
        vaultLoaded = true;
      } catch (err) {
        logger.error("Vault pre-load failed", { error: err });
      }
    }

    // Check memory usage at most once per 60 seconds (avoid syscall overhead)
    const now = Date.now();
    if (now - lastMemoryCheckTime > 60_000) {
      checkMemoryUsage();
      lastMemoryCheckTime = now;
    }

    try {
      // Handle preflight
      if (request.method === "OPTIONS") {
        return handleCorsPreflight(request, additionalOrigins);
      }

      // Check method is supported
      const method = request.method.toUpperCase() as HttpMethod;
      const routeConfig = routes[method];

      if (!routeConfig) {
        const allowedMethods = Object.keys(routes).filter((m) => m !== "OPTIONS");
        return buildErrorResponse(
          new AppError(
            `Method ${method} not allowed. Use: ${allowedMethods.join(", ")}`,
            "METHOD_NOT_ALLOWED",
            405,
          ),
          corsHeaders,
          { version },
        );
      }

      // CSRF protection for mutation methods (POST, PUT, PATCH, DELETE)
      if (csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        const csrfOptions: CsrfOptions = typeof csrf === "object" ? csrf : {};
        csrfOptions.additionalOrigins = [
          ...(csrfOptions.additionalOrigins || []),
          ...(additionalOrigins || []),
        ];

        const csrfResult = validateCsrf(request, csrfOptions);
        if (!csrfResult.valid) {
          logger.warn("CSRF validation failed", {
            reason: csrfResult.reason,
            origin: request.headers.get("origin"),
            referer: request.headers.get("referer"),
          });
          return buildErrorResponse(
            new AppError(
              "Request blocked: origin validation failed",
              "CSRF_VALIDATION_FAILED",
              403,
            ),
            corsHeaders,
            { version },
          );
        }
      }

      // Check API version deprecation
      const requestedVersion = getRequestedVersion(request);
      const deprecationInfo = deprecatedVersions?.find((d) => d.version === requestedVersion);

      // Create Supabase client
      const authHeader = request.headers.get("authorization");
      const supabase = createSupabaseClient(authHeader);

      // Authenticate if required
      const routeRequiresAuth = routeConfig.requireAuth ?? requireAuth;
      let userId: string | null = null;

      if (routeRequiresAuth) {
        userId = await authenticateRequest(supabase);

        if (!userId) {
          return buildErrorResponse(
            new AuthenticationError(),
            corsHeaders,
            { version },
          );
        }

        setUserId(userId);
      } else if (authHeader) {
        // Optional auth - try to get user but don't require it
        userId = await authenticateRequest(supabase);
        if (userId) setUserId(userId);
      }

      // Parse URL and query params
      const url = new URL(request.url);
      const query = parseQueryParams(url);

      // Extract path parameters if pattern is configured
      const params = pathPattern ? extractPathParams(url, pathPattern) : {};

      // Validate query params if schema provided
      const validatedQuery = routeConfig.querySchema
        ? validateWithSchema(routeConfig.querySchema, query, "query parameters")
        : query;

      // Parse and validate body for mutation methods
      let body: unknown = {};
      if (["POST", "PUT", "PATCH"].includes(method)) {
        body = await parseRequestBody(request, maxBodySize);

        if (routeConfig.schema) {
          body = validateWithSchema(routeConfig.schema, body, "request body");
        }
      }

      // Get idempotency key
      const idempotencyKey = request.headers.get("x-idempotency-key");

      // Check idempotency for supported routes
      if (idempotencyKey && routeConfig.idempotent) {
        const idempotencyCheck = await checkIdempotencyKey(
          supabase,
          idempotencyKey,
          `${service}:${method}`,
        );

        if (idempotencyCheck.cached && idempotencyCheck.response) {
          logger.info("Returning cached idempotent response", {
            idempotencyKey,
          });
          return buildSuccessResponse(idempotencyCheck.response, corsHeaders, {
            version,
          });
        }
      }

      // Build handler context
      const handlerContext: HandlerContext = {
        request,
        ctx,
        userId,
        supabase,
        body,
        query: validatedQuery,
        params,
        headers: request.headers,
        idempotencyKey,
        corsHeaders,
        getSecret,
      };

      // Check built-in rate limit if configured
      if (rateLimit) {
        const shouldSkip = rateLimit.skip?.(handlerContext) ?? false;

        if (!shouldSkip) {
          const rateLimitKey = getRateLimitKey(
            handlerContext,
            rateLimit.keyBy,
            service,
          );

          let rateLimitResult: {
            allowed: boolean;
            remaining: number;
            resetAt: number;
          };

          if (rateLimit.distributed) {
            // Use database-backed distributed rate limiting
            const distributed = await checkDistributedRateLimit(rateLimitKey, {
              limit: rateLimit.limit,
              windowMs: rateLimit.windowMs,
              distributed: true,
              keyPrefix: service,
            });
            rateLimitResult = {
              allowed: distributed.allowed,
              remaining: distributed.remaining,
              resetAt: distributed.resetAt,
            };
          } else {
            rateLimitResult = checkInMemoryRateLimit(
              rateLimitKey,
              rateLimit.limit,
              rateLimit.windowMs,
            );
          }

          // Store rate limit info for response headers
          handlerContext.rateLimitInfo = {
            limit: rateLimit.limit,
            remaining: rateLimitResult.remaining,
            reset: rateLimitResult.resetAt,
          };

          if (!rateLimitResult.allowed) {
            const retryAfterMs = rateLimitResult.resetAt - Date.now();
            const errorResponse = buildErrorResponse(
              new RateLimitError("Rate limit exceeded", retryAfterMs),
              corsHeaders,
              { version, retryAfterMs },
            );
            addStandardHeaders(
              errorResponse,
              ctx,
              handlerContext.rateLimitInfo,
            );
            return errorResponse;
          }
        }
      }

      // Check custom rate limit if configured
      if (checkRateLimit) {
        const rateLimitResponse = await checkRateLimit(handlerContext);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Execute handler
      const response = await routeConfig.handler(handlerContext);

      // Store idempotency key for successful mutation responses
      if (
        idempotencyKey &&
        routeConfig.idempotent &&
        response.ok &&
        ["POST", "PUT", "PATCH"].includes(method)
      ) {
        try {
          const responseClone = response.clone();
          const responseData = await responseClone.json();
          await storeIdempotencyKey(
            supabase,
            idempotencyKey,
            `${service}:${method}`,
            responseData.data,
          );
        } catch {
          // Non-critical, log and continue
          logger.warn("Failed to store idempotency key", { idempotencyKey });
        }
      }

      // Add standard headers (response time, rate limit, version)
      addStandardHeaders(response, ctx, handlerContext.rateLimitInfo);

      if (!response.headers.has("X-API-Version")) {
        response.headers.set("X-API-Version", version);
      }

      // Add deprecation headers if this version is deprecated
      if (deprecationInfo) {
        response.headers.set("Deprecation", "true");
        response.headers.set("Sunset", deprecationInfo.sunsetDate);
        response.headers.set("X-Deprecation-Warning", deprecationInfo.message);
        logger.warn("Deprecated API version used", {
          version: deprecationInfo.version,
          sunsetDate: deprecationInfo.sunsetDate,
        });
      }

      perfTracker.end(response.status);
      return response;
    } catch (error) {
      const appError = error instanceof Error ? error : new Error(String(error));

      // Handle CSRF errors with 403 status
      if (error instanceof CsrfError) {
        perfTracker.end(403);
        const csrfResponse = buildErrorResponse(
          new AppError(error.message, "CSRF_VALIDATION_FAILED", 403),
          corsHeaders,
          { version },
        );
        addStandardHeaders(csrfResponse, ctx);
        return csrfResponse;
      }

      // Track error for monitoring
      trackError(appError, {
        service,
        method: request.method,
        url: request.url,
      });

      const statusCode = error instanceof AppError ? error.statusCode : 500;
      perfTracker.end(statusCode);

      const errorResponse = buildErrorResponse(
        appError,
        corsHeaders,
        { version },
      );
      addStandardHeaders(errorResponse, ctx);
      return errorResponse;
    } finally {
      try {
        // Collect spans BEFORE clearing context
        const spans = getSpans();
        const totalMs = Math.round(performance.now() - ctx.startTime);
        if (spans.length > 0) {
          logger.info("Request spans", {
            handler: service,
            requestId: ctx.requestId,
            totalMs,
            spanCount: spans.length,
            spans: spans.map((s: Span) => ({
              op: s.operation,
              ms: s.durationMs,
              status: s.status,
            })),
          });
        }
        clearSpans();
        clearContext();
      } catch (cleanupErr) {
        logger.warn("Handler context cleanup warning", { error: cleanupErr });
      }
    }
  });
}
