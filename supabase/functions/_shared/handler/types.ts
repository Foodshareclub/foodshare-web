/**
 * Handler Types
 *
 * Shared types for the unified API handler family.
 * Extracted from `_shared/api-handler.ts` — import paths unchanged via shim.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestContext } from "../context.ts";
import type { CsrfOptions } from "../csrf.ts";
import type { RateLimitConfig as BaseRateLimitConfig } from "../rate-limiter.ts";

/**
 * Handler-level rate limit configuration.
 *
 * Extends the base limiter config with handler concerns: client key
 * strategy (`keyBy`) and conditional bypass (`skip`). Distinct from
 * `rate-limiter.ts`'s `RateLimitConfig` (which adds `keyPrefix` instead).
 */
export interface HandlerRateLimitConfig extends BaseRateLimitConfig {
  /** Key generator: how to identify the client */
  keyBy?: "ip" | "user" | "device" | ((ctx: HandlerContext) => string);
  /** Skip rate limit for certain conditions */
  skip?: (ctx: HandlerContext) => boolean;
}

/** Schema interface supporting both Zod and Valibot */
export interface Schema<T = unknown> {
  // Zod
  parse?: (data: unknown) => T;
  safeParse?: (
    data: unknown,
  ) => { success: true; data: T } | {
    success: false;
    error: { errors: Array<{ path: (string | number)[]; message: string }> };
  };
  // Valibot (use `any` for input/output to remain compatible with Zod's internal types)
  // deno-lint-ignore no-explicit-any
  _parse?: (input: any) => any;
}

/** Handler context with parsed data and auth info */
export interface HandlerContext<
  TBody = unknown,
  TQuery = Record<string, unknown>,
> {
  /** The original request */
  request: Request;
  /** Request context (requestId, correlationId, etc.) */
  ctx: RequestContext;
  /** Authenticated user ID (if requireAuth is true) */
  userId: string | null;
  /** Supabase client (authenticated if userId is set) */
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>;
  /** Parsed and validated request body */
  body: TBody;
  /** URL query parameters */
  query: TQuery;
  /** URL path parameters (from route matching) */
  params: Record<string, string>;
  /** Request headers */
  headers: Headers;
  /** Idempotency key (if provided) */
  idempotencyKey: string | null;
  /** CORS headers for response */
  corsHeaders: Record<string, string>;
  /** Secret retrieval (from Vault with ENV fallback) */
  getSecret: (name: string) => Promise<string | undefined>;
  /** Rate limit info (populated after rate limit check) */
  rateLimitInfo?: { limit: number; remaining: number; reset: number };
}

/** Route handler function */
export type RouteHandler<TBody = unknown, TQuery = Record<string, unknown>> = (
  ctx: HandlerContext<TBody, TQuery>,
) => Promise<Response>;

/** Route configuration */
export interface RouteConfig<
  TBody = unknown,
  TQuery = Record<string, unknown>,
> {
  /** Zod schema for request body validation (POST/PUT/PATCH) */
  schema?: Schema<TBody>;
  /** Zod schema for query parameters */
  querySchema?: Schema<TQuery>;
  /** Route handler */
  handler: RouteHandler<TBody, TQuery>;
  /** Override auth requirement for this route */
  requireAuth?: boolean;
  /** Enable idempotency check for this route */
  idempotent?: boolean;
}

/** HTTP methods supported */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Deprecated version configuration */
export interface DeprecatedVersion {
  version: string;
  message: string;
  sunsetDate: string; // ISO 8601 date
}

/** API handler configuration */
export interface APIHandlerConfig {
  /** Service name for logging and tracing */
  service: string;
  /** Require authentication for all routes (default: true) */
  requireAuth?: boolean;
  /** API version (for response headers) */
  version?: string;
  /** URL path pattern for path parameter extraction (e.g., "/products/:productId") */
  pathPattern?: string;
  /** Routes by HTTP method */
  // deno-lint-ignore no-explicit-any
  routes: Partial<Record<HttpMethod, RouteConfig<any, any>>>;
  /** Built-in rate limiting configuration */
  rateLimit?: HandlerRateLimitConfig;
  /** Custom rate limit check (return error Response to block) */
  checkRateLimit?: (ctx: HandlerContext) => Promise<Response | null>;
  /** Additional allowed origins */
  additionalOrigins?: string[];
  /** Supported API versions */
  supportedVersions?: string[];
  /** Deprecated versions with sunset dates */
  deprecatedVersions?: DeprecatedVersion[];
  /** CSRF protection configuration (enabled by default for mutation requests) */
  csrf?: CsrfOptions | boolean;
  /** Maximum request body size in bytes (default: 1MB) */
  maxBodySize?: number;
}
