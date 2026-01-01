/**
 * Observability Module
 *
 * Performance monitoring, metrics collection, and distributed tracing.
 *
 * @module lib/observability
 */

// Metrics
export {
  getMetricsCollector,
  recordAPIRequest,
  recordCacheHit,
  recordCacheMiss,
  recordRealtimeConnected,
  recordRealtimeDisconnected,
  recordRealtimeReconnect,
  recordRealtimeMessage,
  getPerformanceMetrics,
  resetMetrics,
} from "./metrics";
export type {
  APIMetrics,
  EndpointMetrics,
  RealtimeMetricsData,
  WebVitals,
  PerformanceMetrics,
  MetricEvent,
} from "./metrics";

// Tracing
export {
  generateTraceId,
  generateSpanId,
  createTraceContext,
  getTraceContext,
  setTraceContext,
  withTraceContext,
  getTraceHeaders,
  parseTraceHeaders,
  configureTracing,
  startSpan,
  endSpan,
  addSpanAttributes,
  trace,
  getTraceSpans,
  getCompletedSpans,
  clearCompletedSpans,
  createTracedFetch,
} from "./tracing";
export type {
  TraceContext,
  Span,
  TracingConfig,
} from "./tracing";
