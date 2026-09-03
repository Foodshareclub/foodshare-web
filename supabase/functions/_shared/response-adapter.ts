/**
 * Response Adapter
 *
 * Unified response format for all Edge Functions:
 * { success, data, meta: { requestId, timestamp, responseTime }, pagination, uiHints }
 *
 * Platform-aware optimizations for iOS, Android, and Web clients.
 *
 * Features:
 * - ETag / 304 Not Modified conditional responses
 * - Correlation ID propagation for distributed tracing
 * - Deprecation / Sunset headers (RFC 8594)
 * - SSE streaming response builder
 * - Retryable error flag surfacing
 *
 * @module response-adapter
 */

import { getContext, getElapsedMs } from "./context.ts";
import { logger } from "./logger.ts";
import type { AppError } from "./errors.ts";

// =============================================================================
// Types
// =============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  /** Whether the client should retry this request */
  retryable?: boolean;
}

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  responseTime: number;
  cacheTTL?: number;
  version?: string;
}

export interface Pagination {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextOffset?: number;
  /** Next cursor for cursor-based pagination */
  nextCursor?: string;
}

export interface UIHints {
  refreshAfter?: number;
  displayMode?: "list" | "grid" | "map";
  badges?: Array<{ text: string; color: string; screen?: string }>;
  pullToRefresh?: boolean;
  showEmptyState?: boolean;
  emptyStateMessage?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta: ResponseMeta;
  pagination?: Pagination;
  uiHints?: UIHints;
}

/**
 * Standard Security Headers
 *
 * Defense-in-depth headers applied to every response:
 * - X-Content-Type-Options: Prevent MIME-sniffing attacks
 * - X-Frame-Options: Prevent clickjacking via iframe embedding
 * - Strict-Transport-Security: Enforce HTTPS for 1 year + subdomains
 * - Referrer-Policy: Prevent leaking full referrer URLs on cross-origin requests
 * - Permissions-Policy: Disable unnecessary browser features from API responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

// =============================================================================
// Response Builders
// =============================================================================

/** Options for deprecation warning headers (RFC 8594) */
export interface DeprecationOptions {
  /** ISO 8601 date when this version was deprecated */
  deprecatedAt?: string;
  /** ISO 8601 date when this version will be removed */
  sunsetDate?: string;
  /** Human-readable deprecation message */
  message?: string;
  /** URL to migration guide */
  link?: string;
}

/**
 * Generate a weak ETag from response body using SHA-256.
 * Returns a W/"..." weak validator suitable for semantic equivalence checks.
 */
export async function generateETag(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  // Use first 16 bytes (128 bits) for a compact but collision-resistant ETag
  const hex = Array.from(hashArray.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `W/"${hex}"`;
}

/**
 * Build a unified success response
 *
 * Supports:
 * - ETag generation + If-None-Match → 304 Not Modified
 * - Correlation ID propagation for distributed tracing
 * - Deprecation / Sunset headers (RFC 8594)
 */
export function buildSuccessResponse<T>(
  data: T,
  corsHeaders: Record<string, string>,
  options?: {
    status?: number;
    pagination?: Pagination;
    uiHints?: UIHints;
    cacheTTL?: number;
    version?: string;
    /** Original request for ETag conditional check (If-None-Match) */
    request?: Request;
    /** Deprecation warning headers */
    deprecation?: DeprecationOptions;
  },
): Response {
  const ctx = getContext();

  const response: APIResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: ctx?.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      responseTime: ctx ? getElapsedMs() : 0,
      cacheTTL: options?.cacheTTL,
      version: options?.version,
    },
    pagination: options?.pagination,
    uiHints: options?.uiHints,
  };

  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  if (ctx?.requestId) {
    headers["X-Request-Id"] = ctx.requestId;
  }

  // Propagate correlation ID for distributed tracing
  if (ctx?.correlationId) {
    headers["X-Correlation-Id"] = ctx.correlationId;
  }

  if (options?.version) {
    headers["X-API-Version"] = options.version;
  }

  if (options?.cacheTTL) {
    headers["Cache-Control"] = `public, max-age=${options.cacheTTL}`;
  }

  // Deprecation headers (RFC 8594)
  if (options?.deprecation) {
    if (options.deprecation.deprecatedAt) {
      headers["Deprecation"] = options.deprecation.deprecatedAt;
    }
    if (options.deprecation.sunsetDate) {
      headers["Sunset"] = options.deprecation.sunsetDate;
    }
    if (options.deprecation.link) {
      headers["Link"] = `<${options.deprecation.link}>; rel="deprecation"; type="text/html"`;
    }
  }

  const body = JSON.stringify(response);

  logger.debug("Building success response", {
    hasData: !!data,
    hasPagination: !!options?.pagination,
    hasUIHints: !!options?.uiHints,
  });

  // ETag / Conditional request: return 304 Not Modified if content unchanged.
  // Hash the resource payload (data, pagination, version) rather than volatile request metadata (timestamp, requestId).
  const etagSource = JSON.stringify({
    data,
    pagination: options?.pagination,
    version: options?.version,
  });
  const etag = `W/"${fnv1aHash(etagSource)}"`;
  headers["ETag"] = etag;

  if (options?.request) {
    const ifNoneMatch = options.request.headers.get("If-None-Match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers,
      });
    }
  }

  return new Response(body, {
    status: options?.status || 200,
    headers,
  });
}

/**
 * Fast FNV-1a hash for ETag generation (synchronous, no crypto overhead).
 * Produces a 64-bit hex string — sufficient for cache invalidation.
 */
function fnv1aHash(str: string): string {
  let h = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime (32-bit)
  }
  // Convert to unsigned 32-bit hex
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Build a unified error response
 *
 * In production, strips `details` from non-validation errors to prevent
 * internal field name leakage. Keeps `details` for VALIDATION_ERROR since
 * clients need field-level error info.
 */
export function buildErrorResponse(
  error: AppError | Error | {
    code: string;
    message: string;
    details?: unknown;
  },
  corsHeaders: Record<string, string>,
  options?: {
    status?: number;
    version?: string;
    retryAfterMs?: number;
  },
): Response {
  const ctx = getContext();
  const isProduction = Deno.env.get("ENVIRONMENT") === "production";

  // Determine status code
  let statusCode = options?.status || 500;
  if ("statusCode" in error && typeof error.statusCode === "number") {
    statusCode = error.statusCode;
  }

  // Determine retryable flag from AppError
  const retryable = "retryable" in error &&
      typeof error.retryable === "boolean"
    ? error.retryable
    : undefined;

  // Build error body
  let errorBody: APIError;
  if ("code" in error && typeof error.code === "string") {
    const rawDetails = "details" in error ? error.details : undefined;
    // In production, only expose details for validation errors
    const details = isProduction && error.code !== "VALIDATION_ERROR" ? undefined : rawDetails;

    errorBody = {
      code: error.code,
      message: error.message,
      details,
      retryable,
    };
  } else {
    errorBody = {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Internal server error" : error.message,
      retryable,
    };
  }

  const response: APIResponse<never> = {
    success: false,
    error: errorBody,
    meta: {
      requestId: ctx?.requestId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      responseTime: ctx ? getElapsedMs() : 0,
      version: options?.version,
    },
  };

  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  if (ctx?.requestId) {
    headers["X-Request-Id"] = ctx.requestId;
  }

  // Propagate correlation ID for distributed tracing
  if (ctx?.correlationId) {
    headers["X-Correlation-Id"] = ctx.correlationId;
  }

  if (options?.retryAfterMs) {
    headers["Retry-After"] = String(Math.ceil(options.retryAfterMs / 1000));
  }

  // Log the error
  logger.error(
    "Request failed",
    error instanceof Error ? error : new Error(String(error)),
    {
      statusCode,
      errorCode: "code" in error ? error.code : "INTERNAL_ERROR",
    },
  );

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers,
  });
}

/**
 * Build a 204 No Content response with security and CORS headers.
 *
 * Use for DELETE endpoints and mutation operations that return no body.
 */
export function buildNoContentResponse(
  corsHeaders: Record<string, string>,
): Response {
  const ctx = getContext();

  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    ...corsHeaders,
  };

  if (ctx?.requestId) {
    headers["X-Request-Id"] = ctx.requestId;
  }
  if (ctx?.correlationId) {
    headers["X-Correlation-Id"] = ctx.correlationId;
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Build a Server-Sent Events (SSE) streaming response.
 *
 * Returns a `Response` with `text/event-stream` content type and proper
 * headers for streaming. The caller provides a `ReadableStream` that
 * emits SSE-formatted data.
 *
 * @example
 * ```typescript
 * const stream = new ReadableStream({
 *   start(controller) {
 *     controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
 *     controller.close();
 *   },
 * });
 * return buildStreamResponse(stream, corsHeaders);
 * ```
 */
export function buildStreamResponse(
  stream: ReadableStream,
  corsHeaders: Record<string, string>,
): Response {
  const ctx = getContext();

  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    ...corsHeaders,
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering for SSE
  };

  if (ctx?.requestId) {
    headers["X-Request-Id"] = ctx.requestId;
  }
  if (ctx?.correlationId) {
    headers["X-Correlation-Id"] = ctx.correlationId;
  }

  return new Response(stream, {
    status: 200,
    headers,
  });
}

// =============================================================================
// Platform-Specific Response Optimization
// =============================================================================

export type Platform = "ios" | "android" | "web" | "unknown";

/**
 * Platform-specific UI hints
 */
export const PLATFORM_UI_HINTS: Record<Platform, Partial<UIHints>> = {
  ios: {
    refreshAfter: 300, // 5 minutes - ProMotion-aware
    displayMode: "list",
    pullToRefresh: true,
  },
  android: {
    refreshAfter: 300,
    displayMode: "list",
    pullToRefresh: true,
  },
  web: {
    refreshAfter: 600, // 10 minutes - longer for web
    displayMode: "grid",
    pullToRefresh: false,
  },
  unknown: {
    refreshAfter: 300,
    displayMode: "list",
    pullToRefresh: true,
  },
};

/**
 * Detect platform from request
 */
export function detectPlatform(request: Request): Platform {
  // Check explicit header first
  const platformHeader = request.headers.get("X-Client-Platform")
    ?.toLowerCase();
  if (
    platformHeader === "ios" || platformHeader === "android" ||
    platformHeader === "web"
  ) {
    return platformHeader;
  }

  // Detect from User-Agent
  const ua = request.headers.get("User-Agent") || "";

  // iOS detection (check specific iOS markers)
  if (
    ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iOS") ||
    ua.includes("Darwin")
  ) {
    return "ios";
  }

  // Android detection
  if (ua.includes("Android")) {
    return "android";
  }

  // Web detection (browsers)
  if (
    ua.includes("Mozilla") ||
    ua.includes("Chrome") ||
    ua.includes("Safari") ||
    ua.includes("Firefox") ||
    ua.includes("Edge")
  ) {
    return "web";
  }

  return "unknown";
}

/**
 * Get platform-aware UI hints
 */
export function getPlatformUIHints(
  platform: Platform,
  customHints?: Partial<UIHints>,
): UIHints {
  const baseHints = PLATFORM_UI_HINTS[platform] || PLATFORM_UI_HINTS.unknown;
  return {
    ...baseHints,
    ...customHints,
  } as UIHints;
}

/**
 * Platform-specific response transformation options
 */
export interface PlatformOptimizationOptions {
  /** Minimize payload for bandwidth-constrained mobile */
  minimizePayload?: boolean;
  /** Include ProMotion hints for iOS */
  proMotionHints?: boolean;
  /** Include SEO-friendly URLs for web */
  includeCanonicalUrls?: boolean;
  /** Base URL for canonical URLs */
  baseUrl?: string;
}

/**
 * Apply platform-specific optimizations to response data
 */
export function applyPlatformOptimizations<T extends Record<string, unknown>>(
  data: T,
  platform: Platform,
  options?: PlatformOptimizationOptions,
): T & { _platformHints?: Record<string, unknown> } {
  const result = { ...data } as T & {
    _platformHints?: Record<string, unknown>;
  };

  switch (platform) {
    case "ios": {
      if (options?.proMotionHints) {
        result._platformHints = {
          ...result._platformHints,
          preferredFPS: 120,
          supportsProMotion: true,
          animationPreferences: {
            springDamping: 0.8,
            springResponse: 0.3,
          },
        };
      }
      break;
    }

    case "android": {
      if (options?.minimizePayload) {
        for (const key of Object.keys(result)) {
          if (result[key] === null || result[key] === undefined) {
            delete result[key];
          }
        }
        result._platformHints = {
          ...result._platformHints,
          materialDesign: true,
          useDataMessages: true,
        };
      }
      break;
    }

    case "web": {
      if (options?.includeCanonicalUrls && options?.baseUrl) {
        result._platformHints = {
          ...result._platformHints,
          seoMode: true,
          baseUrl: options.baseUrl,
        };

        if ("id" in data && typeof data.id === "string") {
          (result as Record<string, unknown>).canonicalUrl = `${options.baseUrl}/${data.id}`;
        }
      }
      break;
    }
  }

  return result;
}

/**
 * Build platform-optimized response
 */
export function buildPlatformOptimizedResponse<T>(
  request: Request,
  data: T,
  corsHeaders: Record<string, string>,
  options?: {
    status?: number;
    pagination?: Pagination;
    cacheTTL?: number;
    version?: string;
    platformOptions?: PlatformOptimizationOptions;
  },
): Response {
  const platform = detectPlatform(request);
  const platformUIHints = getPlatformUIHints(
    platform,
    options?.pagination ? { showEmptyState: true } : undefined,
  );

  // Apply platform-specific data transformations if data is an object
  let optimizedData = data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    optimizedData = applyPlatformOptimizations(
      data as unknown as Record<string, unknown>,
      platform,
      {
        proMotionHints: platform === "ios",
        minimizePayload: platform === "android",
        includeCanonicalUrls: platform === "web",
        baseUrl: "https://foodshare.app",
        ...options?.platformOptions,
      },
    ) as unknown as T;
  }

  return buildSuccessResponse(optimizedData, corsHeaders, {
    status: options?.status,
    pagination: options?.pagination,
    uiHints: platformUIHints,
    cacheTTL: options?.cacheTTL,
    version: options?.version,
  });
}

/**
 * Create deep link URLs for all platforms
 */
export function createDeepLinks(
  entityType: "listing" | "profile" | "chat" | "notification",
  entityId: string,
  baseWebUrl: string = "https://foodshare.app",
): Record<Platform, string> {
  const paths: Record<typeof entityType, string> = {
    listing: "listing",
    profile: "profile",
    chat: "chat",
    notification: "notifications",
  };

  const path = paths[entityType];

  return {
    ios: `foodshare://${path}/${entityId}`,
    android: `foodshare://${path}/${entityId}`,
    web: `${baseWebUrl}/${path}/${entityId}`,
    unknown: `${baseWebUrl}/${path}/${entityId}`,
  };
}
