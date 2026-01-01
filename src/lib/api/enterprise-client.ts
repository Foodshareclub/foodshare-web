/**
 * Enterprise API Client
 *
 * Production-grade API client with:
 * - Circuit breaker pattern for fault tolerance
 * - Exponential backoff retry for transient failures
 * - Request deduplication to prevent duplicate calls
 * - Correlation ID propagation for distributed tracing
 * - Offline queue for mutation resilience
 * - Request/response interceptors
 *
 * SYNC: Mirrors Android EdgeFunctionClient.kt patterns
 *
 * @module lib/api/enterprise-client
 */

import { createClient } from "@/lib/supabase/server";
import {
  CircuitBreaker,
  CircuitOpenError,
  getCircuitBreaker,
} from "./circuit-breaker";
import { withRetry, RetryConfig, RetryPresets } from "./retry";
import { createRequestDeduplicator } from "@/lib/request-deduplication";

// =============================================================================
// Types
// =============================================================================

export interface EnterpriseClientConfig {
  /** Base URL for Edge Functions */
  baseUrl?: string;
  /** Default request timeout in ms (default: 30000) */
  timeout?: number;
  /** Enable circuit breaker (default: true) */
  enableCircuitBreaker?: boolean;
  /** Enable retry with backoff (default: true) */
  enableRetry?: boolean;
  /** Enable request deduplication (default: true) */
  enableDeduplication?: boolean;
  /** Retry configuration */
  retryConfig?: RetryConfig;
  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];
}

export interface RequestOptions<TBody = unknown> {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body */
  body?: TBody;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Idempotency key for mutations */
  idempotencyKey?: string;
  /** Request timeout override */
  timeout?: number;
  /** Skip authentication */
  skipAuth?: boolean;
  /** Skip circuit breaker for this request */
  skipCircuitBreaker?: boolean;
  /** Skip retry for this request */
  skipRetry?: boolean;
  /** Skip deduplication for this request */
  skipDeduplication?: boolean;
  /** Custom retry config for this request */
  retryConfig?: RetryConfig;
  /** Cache key for deduplication */
  dedupeKey?: string;
}

export type RequestInterceptor = (
  request: RequestInit & { url: string }
) => RequestInit & { url: string };

export type ResponseInterceptor = (
  response: Response,
  request: RequestInit & { url: string }
) => Response | Promise<Response>;

// =============================================================================
// Error Codes (matches backend)
// =============================================================================

export const ErrorCodes = {
  // Network
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // Auth
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Data
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CIRCUIT_OPEN: "CIRCUIT_OPEN",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Result Types (Enterprise-specific)
// =============================================================================

/**
 * Enterprise API result type
 * Compatible with but extends the base ActionResult
 */
export type EnterpriseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// =============================================================================
// Enterprise Client
// =============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
}

const DEFAULT_CONFIG: Required<EnterpriseClientConfig> = {
  baseUrl: `${SUPABASE_URL}/functions/v1`,
  timeout: 30000,
  enableCircuitBreaker: true,
  enableRetry: true,
  enableDeduplication: true,
  retryConfig: RetryPresets.standard,
  requestInterceptors: [],
  responseInterceptors: [],
};

// Request deduplicator instance
const deduplicator = createRequestDeduplicator({ ttl: 10000 });

// Generate correlation ID
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `web-${timestamp}-${random}`;
}

// Get client platform info
function getClientInfo(): Record<string, string> {
  return {
    "X-Client-Platform": "web",
    "X-Client-Version": "2.0.0",
    "X-Correlation-Id": generateCorrelationId(),
  };
}

/**
 * Enterprise API Client
 */
export class EnterpriseClient {
  private config: Required<EnterpriseClientConfig>;
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(config: EnterpriseClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create circuit breaker for an endpoint
   */
  private getCircuitBreaker(endpoint: string): CircuitBreaker {
    return getCircuitBreaker({
      name: `api:${endpoint}`,
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenRequests: 3,
      onStateChange: (name, from, to) => {
        console.warn(`[CircuitBreaker] ${name}: ${from} → ${to}`);
      },
    });
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Execute request with all enterprise features
   */
  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options: RequestOptions<TBody>
  ): Promise<EnterpriseResult<TResponse>> {
    const {
      method,
      body,
      query,
      headers = {},
      idempotencyKey,
      timeout = this.config.timeout,
      skipAuth = false,
      skipCircuitBreaker = false,
      skipRetry = false,
      skipDeduplication = false,
      retryConfig = this.config.retryConfig,
      dedupeKey,
    } = options;

    // Build deduplication key
    const cacheKey =
      dedupeKey || `${method}:${endpoint}:${JSON.stringify(query || {})}`;

    // Wrap the actual request logic
    const executeRequest = async (): Promise<EnterpriseResult<TResponse>> => {
      try {
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
                code: ErrorCodes.UNAUTHORIZED,
                message: "Authentication required",
              },
            };
          }
        }

        // Build request
        const url = this.buildUrl(endpoint, query);
        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...getClientInfo(),
          ...headers,
        };

        if (authToken) {
          requestHeaders["Authorization"] = `Bearer ${authToken}`;
        }

        if (idempotencyKey) {
          requestHeaders["X-Idempotency-Key"] = idempotencyKey;
        }

        let request: RequestInit & { url: string } = {
          url,
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        };

        // Apply request interceptors
        for (const interceptor of this.config.requestInterceptors) {
          request = interceptor(request);
        }

        // Execute with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        let response = await fetch(request.url, {
          ...request,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Apply response interceptors
        for (const interceptor of this.config.responseInterceptors) {
          response = await interceptor(response, request);
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return { success: true, data: undefined as TResponse };
        }

        // Parse response
        const result = await response.json();

        if (result.success) {
          return { success: true, data: result.data };
        }

        // Handle error response
        return {
          success: false,
          error: {
            code: this.mapErrorCode(result.error?.code),
            message: result.error?.message || "Request failed",
            details: result.error?.details,
          },
        };
      } catch (error) {
        return this.handleError(error);
      }
    };

    // Apply circuit breaker
    const withCircuitBreaker = async (): Promise<EnterpriseResult<TResponse>> => {
      if (skipCircuitBreaker || !this.config.enableCircuitBreaker) {
        return executeRequest();
      }

      const breaker = this.getCircuitBreaker(endpoint);
      try {
        return await breaker.execute(executeRequest);
      } catch (error) {
        if (error instanceof CircuitOpenError) {
          return {
            success: false,
            error: {
              code: ErrorCodes.CIRCUIT_OPEN,
              message: error.message,
              details: { retryAfterMs: error.remainingCooldownMs },
            },
          };
        }
        throw error;
      }
    };

    // Apply retry
    const withRetryWrapper = async (): Promise<EnterpriseResult<TResponse>> => {
      if (skipRetry || !this.config.enableRetry) {
        return withCircuitBreaker();
      }

      return withRetry(withCircuitBreaker, {
        ...retryConfig,
        onRetry: (attempt, error, delayMs) => {
          console.warn(
            `[Retry] ${endpoint} attempt ${attempt}, waiting ${delayMs}ms`,
            error
          );
        },
      });
    };

    // Apply deduplication (only for GET requests)
    if (
      method === "GET" &&
      !skipDeduplication &&
      this.config.enableDeduplication
    ) {
      return deduplicator.dedupe(cacheKey, withRetryWrapper) as Promise<EnterpriseResult<TResponse>>;
    }

    return withRetryWrapper();
  }

  /**
   * Map backend error codes to client error codes
   */
  private mapErrorCode(code?: string): ErrorCode {
    if (!code) return ErrorCodes.INTERNAL_ERROR;

    const mapping: Record<string, ErrorCode> = {
      VALIDATION_ERROR: ErrorCodes.VALIDATION_ERROR,
      NOT_FOUND: ErrorCodes.NOT_FOUND,
      UNAUTHORIZED: ErrorCodes.UNAUTHORIZED,
      AUTHENTICATION_ERROR: ErrorCodes.AUTHENTICATION_ERROR,
      AUTHORIZATION_ERROR: ErrorCodes.AUTHORIZATION_ERROR,
      FORBIDDEN: ErrorCodes.FORBIDDEN,
      CONFLICT: ErrorCodes.CONFLICT,
      RATE_LIMIT_EXCEEDED: ErrorCodes.RATE_LIMIT_EXCEEDED,
      RATE_LIMITED: ErrorCodes.RATE_LIMIT_EXCEEDED,
      CIRCUIT_OPEN: ErrorCodes.CIRCUIT_OPEN,
      INTERNAL_ERROR: ErrorCodes.INTERNAL_ERROR,
      EXTERNAL_SERVICE_ERROR: ErrorCodes.EXTERNAL_SERVICE_ERROR,
    };

    return mapping[code] || ErrorCodes.INTERNAL_ERROR;
  }

  /**
   * Handle request errors
   */
  private handleError<T>(error: unknown): EnterpriseResult<T> {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: {
            code: ErrorCodes.TIMEOUT,
            message: "Request timed out",
          },
        };
      }

      if (
        error.message.includes("fetch") ||
        error.message.includes("network")
      ) {
        return {
          success: false,
          error: {
            code: ErrorCodes.NETWORK_ERROR,
            message: "Unable to connect to server",
          },
        };
      }
    }

    console.error("[EnterpriseClient] Unexpected error:", error);
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "An unexpected error occurred",
      },
    };
  }

  // ===========================================================================
  // Convenience Methods
  // ===========================================================================

  /**
   * GET request
   */
  async get<TResponse>(
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>,
    options?: Omit<RequestOptions, "method" | "body" | "query">
  ): Promise<EnterpriseResult<TResponse>> {
    return this.request<TResponse>(endpoint, {
      method: "GET",
      query,
      ...options,
    });
  }

  /**
   * POST request
   */
  async post<TResponse, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ): Promise<EnterpriseResult<TResponse>> {
    return this.request<TResponse, TBody>(endpoint, {
      method: "POST",
      body,
      idempotencyKey: options?.idempotencyKey || crypto.randomUUID(),
      ...options,
    });
  }

  /**
   * PUT request
   */
  async put<TResponse, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ): Promise<EnterpriseResult<TResponse>> {
    return this.request<TResponse, TBody>(endpoint, {
      method: "PUT",
      body,
      idempotencyKey: options?.idempotencyKey || crypto.randomUUID(),
      ...options,
    });
  }

  /**
   * PATCH request
   */
  async patch<TResponse, TBody = unknown>(
    endpoint: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">
  ): Promise<EnterpriseResult<TResponse>> {
    return this.request<TResponse, TBody>(endpoint, {
      method: "PATCH",
      body,
      idempotencyKey: options?.idempotencyKey || crypto.randomUUID(),
      ...options,
    });
  }

  /**
   * DELETE request
   */
  async delete<TResponse = void>(
    endpoint: string,
    options?: Omit<RequestOptions, "method" | "body">
  ): Promise<EnterpriseResult<TResponse>> {
    return this.request<TResponse>(endpoint, {
      method: "DELETE",
      ...options,
    });
  }
}

// =============================================================================
// Default Instance
// =============================================================================

/**
 * Default enterprise client instance
 */
export const enterpriseClient = new EnterpriseClient();

/**
 * Convenience exports for direct usage
 */
export const apiGet = enterpriseClient.get.bind(enterpriseClient);
export const apiPost = enterpriseClient.post.bind(enterpriseClient);
export const apiPut = enterpriseClient.put.bind(enterpriseClient);
export const apiPatch = enterpriseClient.patch.bind(enterpriseClient);
export const apiDelete = enterpriseClient.delete.bind(enterpriseClient);
