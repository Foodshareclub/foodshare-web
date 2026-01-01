/**
 * Distributed Tracing
 *
 * Propagates correlation IDs from client → Edge Functions → Database.
 * Enables end-to-end request tracing across the entire stack.
 *
 * @module lib/observability/tracing
 */

// =============================================================================
// Types
// =============================================================================

export interface TraceContext {
  /** Unique trace ID (spans entire request chain) */
  traceId: string;
  /** Unique span ID (this specific operation) */
  spanId: string;
  /** Parent span ID (if nested) */
  parentSpanId?: string;
  /** Whether this trace is sampled for detailed logging */
  sampled: boolean;
  /** Trace start time */
  startTime: number;
  /** Additional baggage items */
  baggage: Record<string, string>;
}

export interface Span {
  /** Span ID */
  id: string;
  /** Trace ID */
  traceId: string;
  /** Parent span ID */
  parentId?: string;
  /** Operation name */
  name: string;
  /** Start time (performance.now()) */
  startTime: number;
  /** End time (performance.now()) */
  endTime?: number;
  /** Duration in ms */
  durationMs?: number;
  /** Span status */
  status: "ok" | "error" | "pending";
  /** Error message if status is error */
  error?: string;
  /** Span attributes */
  attributes: Record<string, string | number | boolean>;
  /** Child spans */
  children: Span[];
}

export interface TracingConfig {
  /** Service name */
  serviceName?: string;
  /** Sampling rate (0-1, default: 1.0 in dev, 0.1 in prod) */
  samplingRate?: number;
  /** Enable console logging of traces */
  enableConsoleLogging?: boolean;
  /** Callback when span completes */
  onSpanComplete?: (span: Span) => void;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${random}`;
}

/**
 * Generate a unique span ID
 */
export function generateSpanId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// =============================================================================
// Trace Context
// =============================================================================

let currentContext: TraceContext | null = null;

/**
 * Create a new trace context
 */
export function createTraceContext(sampled?: boolean): TraceContext {
  const samplingRate =
    process.env.NODE_ENV === "production" ? 0.1 : 1.0;

  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sampled: sampled ?? Math.random() < samplingRate,
    startTime: performance.now(),
    baggage: {},
  };
}

/**
 * Get the current trace context
 */
export function getTraceContext(): TraceContext | null {
  return currentContext;
}

/**
 * Set the current trace context
 */
export function setTraceContext(context: TraceContext | null): void {
  currentContext = context;
}

/**
 * Run a function with a trace context
 */
export async function withTraceContext<T>(
  context: TraceContext,
  fn: () => Promise<T>
): Promise<T> {
  const previousContext = currentContext;
  currentContext = context;

  try {
    return await fn();
  } finally {
    currentContext = previousContext;
  }
}

/**
 * Get headers for propagating trace context
 */
export function getTraceHeaders(): Record<string, string> {
  const ctx = currentContext;
  if (!ctx) {
    // Create a new context if none exists
    const newCtx = createTraceContext();
    return {
      "X-Trace-Id": newCtx.traceId,
      "X-Span-Id": newCtx.spanId,
      "X-Correlation-Id": newCtx.traceId,
      "X-Request-Id": newCtx.spanId,
    };
  }

  const headers: Record<string, string> = {
    "X-Trace-Id": ctx.traceId,
    "X-Span-Id": ctx.spanId,
    "X-Correlation-Id": ctx.traceId,
    "X-Request-Id": ctx.spanId,
  };

  if (ctx.parentSpanId) {
    headers["X-Parent-Span-Id"] = ctx.parentSpanId;
  }

  // Add baggage items
  if (Object.keys(ctx.baggage).length > 0) {
    headers["X-Baggage"] = Object.entries(ctx.baggage)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join(",");
  }

  return headers;
}

/**
 * Parse trace context from headers
 */
export function parseTraceHeaders(headers: Headers | Record<string, string>): TraceContext | null {
  const get = (key: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(key);
    }
    return headers[key] || null;
  };

  const traceId = get("X-Trace-Id") || get("X-Correlation-Id");
  if (!traceId) return null;

  const baggage: Record<string, string> = {};
  const baggageHeader = get("X-Baggage");
  if (baggageHeader) {
    for (const item of baggageHeader.split(",")) {
      const [key, value] = item.split("=");
      if (key && value) {
        baggage[key] = decodeURIComponent(value);
      }
    }
  }

  return {
    traceId,
    spanId: get("X-Span-Id") || generateSpanId(),
    parentSpanId: get("X-Parent-Span-Id") || undefined,
    sampled: true,
    startTime: performance.now(),
    baggage,
  };
}

// =============================================================================
// Span Management
// =============================================================================

const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];
const MAX_COMPLETED_SPANS = 100;

let config: TracingConfig = {
  serviceName: "foodshare-web",
  samplingRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enableConsoleLogging: process.env.NODE_ENV !== "production",
};

/**
 * Configure tracing
 */
export function configureTracing(newConfig: TracingConfig): void {
  config = { ...config, ...newConfig };
}

/**
 * Start a new span
 */
export function startSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const ctx = currentContext || createTraceContext();

  const span: Span = {
    id: generateSpanId(),
    traceId: ctx.traceId,
    parentId: ctx.spanId,
    name,
    startTime: performance.now(),
    status: "pending",
    attributes: {
      "service.name": config.serviceName || "unknown",
      ...attributes,
    },
    children: [],
  };

  activeSpans.set(span.id, span);

  // Update context with new span
  setTraceContext({
    ...ctx,
    spanId: span.id,
    parentSpanId: ctx.spanId,
  });

  return span;
}

/**
 * End a span
 */
export function endSpan(
  span: Span,
  status: "ok" | "error" = "ok",
  error?: string
): void {
  span.endTime = performance.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
  span.error = error;

  activeSpans.delete(span.id);

  // Store completed span
  completedSpans.push(span);
  if (completedSpans.length > MAX_COMPLETED_SPANS) {
    completedSpans.shift();
  }

  // Log if enabled
  if (config.enableConsoleLogging) {
    const statusIcon = status === "ok" ? "✓" : "✗";
    console.log(
      `[Trace] ${statusIcon} ${span.name} (${span.durationMs.toFixed(1)}ms)`,
      span.attributes
    );
  }

  // Callback
  config.onSpanComplete?.(span);

  // Restore parent context
  const ctx = currentContext;
  if (ctx && ctx.spanId === span.id) {
    setTraceContext({
      ...ctx,
      spanId: span.parentId || ctx.traceId,
      parentSpanId: undefined,
    });
  }
}

/**
 * Add attributes to a span
 */
export function addSpanAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean>
): void {
  Object.assign(span.attributes, attributes);
}

/**
 * Trace a function execution
 */
export async function trace<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {}
): Promise<T> {
  const span = startSpan(name, attributes);

  try {
    const result = await fn();
    endSpan(span, "ok");
    return result;
  } catch (error) {
    endSpan(span, "error", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get completed spans for a trace
 */
export function getTraceSpans(traceId: string): Span[] {
  return completedSpans.filter((s) => s.traceId === traceId);
}

/**
 * Get all completed spans
 */
export function getCompletedSpans(): Span[] {
  return [...completedSpans];
}

/**
 * Clear completed spans
 */
export function clearCompletedSpans(): void {
  completedSpans.length = 0;
}

// =============================================================================
// Request Tracing Middleware
// =============================================================================

/**
 * Create a traced fetch function
 */
export function createTracedFetch(
  baseFetch: typeof fetch = fetch
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || "GET";

    const span = startSpan(`HTTP ${method}`, {
      "http.method": method,
      "http.url": url,
    });

    // Add trace headers
    const headers = new Headers(init?.headers);
    const traceHeaders = getTraceHeaders();
    for (const [key, value] of Object.entries(traceHeaders)) {
      headers.set(key, value);
    }

    try {
      const response = await baseFetch(input, {
        ...init,
        headers,
      });

      addSpanAttributes(span, {
        "http.status_code": response.status,
      });

      endSpan(span, response.ok ? "ok" : "error");
      return response;
    } catch (error) {
      endSpan(span, "error", error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
}

// Expose in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).traceSpans = getCompletedSpans;
}
