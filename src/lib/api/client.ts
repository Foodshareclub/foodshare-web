/**
 * Unified API Client for Edge Functions
 *
 * Provides a consistent interface for calling Edge Functions from the web app.
 * All mutations should go through this client to ensure consistency with iOS/Android.
 */

import type { ActionResult, ErrorCode } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { APIErrorResponse } from "./types";

const APP_VERSION = "3.0.2";

// =============================================================================
// Configuration
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
}

const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// =============================================================================
// Types
// =============================================================================

export interface APICallOptions<TBody = unknown> {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE";
  /** Request body (will be JSON stringified) */
  body?: TBody;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Idempotency key for POST/PUT (prevents duplicate submissions) */
  idempotencyKey?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Skip authentication (for public endpoints) */
  skipAuth?: boolean;
}

// =============================================================================
// Error Code Mapping
// =============================================================================

const ERROR_CODE_MAP: Record<string, ErrorCode> = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMIT",
  RATE_LIMIT: "RATE_LIMIT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",
  AUTHENTICATION_ERROR: "UNAUTHORIZED",
  AUTHORIZATION_ERROR: "FORBIDDEN",
};

function mapErrorCode(code: string): ErrorCode {
  return ERROR_CODE_MAP[code] || "INTERNAL_ERROR";
}

function isErrorResponse(value: unknown): value is APIErrorResponse {
  if (!value || typeof value !== "object" || !("success" in value) || value.success !== false) {
    return false;
  }
  return (
    "error" in value &&
    !!value.error &&
    typeof value.error === "object" &&
    "code" in value.error &&
    typeof value.error.code === "string" &&
    "message" in value.error &&
    typeof value.error.message === "string"
  );
}

function httpError(status: number): ActionResult<never> {
  const errors: Record<number, [ErrorCode, string]> = {
    400: ["VALIDATION_ERROR", "Invalid request"],
    401: ["UNAUTHORIZED", "Authentication required"],
    403: ["FORBIDDEN", "You do not have permission to perform this action"],
    404: ["NOT_FOUND", "Resource not found"],
    408: ["TIMEOUT", "Request timed out"],
    409: ["CONFLICT", "The resource has changed. Please refresh and try again"],
    413: ["PAYLOAD_TOO_LARGE", "Request is too large"],
    422: ["VALIDATION_ERROR", "Invalid request"],
    429: ["RATE_LIMIT", "Too many requests. Please try again later"],
    502: ["SERVICE_UNAVAILABLE", "Service temporarily unavailable"],
    503: ["SERVICE_UNAVAILABLE", "Service temporarily unavailable"],
    504: ["TIMEOUT", "Request timed out"],
  };
  const [code, message] = errors[status] ?? ["INTERNAL_ERROR", "Server returned an invalid response"];
  return { success: false, error: { code, message } };
}

// =============================================================================
// API Client
// =============================================================================

/**
 * Call an Edge Function endpoint
 *
 * @param endpoint - Edge Function name (e.g., "api-v1-products")
 * @param options - Request options
 * @returns ActionResult compatible with existing Server Actions
 *
 * @example
 * ```ts
 * const result = await apiCall<ProductResponse>("api-v1-products", {
 *   method: "POST",
 *   body: { title: "My Product", ... },
 *   idempotencyKey: crypto.randomUUID(),
 * });
 * ```
 */
export async function apiCall<TResponse, TBody = unknown>(
  endpoint: string,
  options: APICallOptions<TBody>,
): Promise<ActionResult<TResponse>> {
  const { method, body, query, idempotencyKey, timeout = 30000, skipAuth = false } = options;
  const correlationId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  try {
    // Build URL with query params
    const url = new URL(`${EDGE_FUNCTIONS_URL}/${endpoint}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Get auth token
    let authToken: string | undefined;
    if (!skipAuth) {
      const supabase = await createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      authToken = session?.access_token;

      if (!authToken) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        };
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Client-Platform": "web",
      "X-Correlation-Id": correlationId,
      "X-App-Version": APP_VERSION,
    };

    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (apiKey) {
      headers.apikey = apiKey;
    }

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    if (idempotencyKey) {
      headers["X-Idempotency-Key"] = idempotencyKey;
    }

    // Make request with timeout
    const controller = new AbortController();
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // Handle 204 No Content (successful delete)
    if (response.status === 204) {
      return {
        success: true,
        data: undefined as TResponse,
      };
    }

    // Gateways may return HTML or a different JSON shape. Keep the deadline
    // active until the body has finished, and preserve meaningful HTTP errors.
    let result: unknown;
    try {
      result = await response.json();
    } catch (error) {
      if (timedOut) throw error;
      return httpError(response.status);
    }

    if (isErrorResponse(result)) {
      return {
        success: false,
        error: {
          code: mapErrorCode(result.error.code),
          message: result.error.message,
          details: result.error.details,
        },
      };
    }

    if (!response.ok) return httpError(response.status);

    // Convert to ActionResult
    if (result && typeof result === "object" && "success" in result && result.success === true && "data" in result) {
      return {
        success: true,
        data: result.data as TResponse,
      };
    }

    return httpError(response.status);
  } catch (error) {
    if (timedOut) {
      return { success: false, error: { code: "TIMEOUT", message: "Request timed out" } };
    }
    // Handle network/timeout errors
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: {
            code: "TIMEOUT",
            message: "Request timed out",
          },
        };
      }

      if (error.message.includes("fetch") || error.message.includes("network")) {
        return {
          success: false,
          error: {
            code: "NETWORK_ERROR",
            message: "Unable to connect to server",
          },
        };
      }
    }

    console.error(`[apiCall] Unexpected error (correlation: ${correlationId}):`, error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

// =============================================================================
// Convenience Methods
// =============================================================================

/**
 * GET request to Edge Function
 */
export async function apiGet<TResponse>(
  endpoint: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: Omit<APICallOptions, "method" | "body" | "query">,
): Promise<ActionResult<TResponse>> {
  return apiCall<TResponse>(endpoint, {
    method: "GET",
    query,
    ...options,
  });
}

/**
 * POST request to Edge Function
 */
export async function apiPost<TResponse, TBody = unknown>(
  endpoint: string,
  body: TBody,
  options?: Omit<APICallOptions<TBody>, "method" | "body">,
): Promise<ActionResult<TResponse>> {
  return apiCall<TResponse, TBody>(endpoint, {
    method: "POST",
    body,
    idempotencyKey: crypto.randomUUID(), // Auto-generate if not provided
    ...options,
  });
}

/**
 * PUT request to Edge Function
 */
export async function apiPut<TResponse, TBody = unknown>(
  endpoint: string,
  body: TBody,
  query?: Record<string, string | number | boolean | undefined>,
  options?: Omit<APICallOptions<TBody>, "method" | "body" | "query">,
): Promise<ActionResult<TResponse>> {
  return apiCall<TResponse, TBody>(endpoint, {
    method: "PUT",
    body,
    query,
    idempotencyKey: crypto.randomUUID(),
    ...options,
  });
}

/**
 * DELETE request to Edge Function
 */
export async function apiDelete<TResponse = void>(
  endpoint: string,
  query?: Record<string, string | number | boolean | undefined>,
  options?: Omit<APICallOptions, "method" | "body" | "query">,
): Promise<ActionResult<TResponse>> {
  return apiCall<TResponse>(endpoint, {
    method: "DELETE",
    query,
    ...options,
  });
}
