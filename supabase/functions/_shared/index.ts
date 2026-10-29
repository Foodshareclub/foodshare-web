/**
 * Shared edge-function utilities — domain-grouped barrel.
 *
 * Import from `@shared` (import-map alias) or this barrel for
 * discoverability. Deep relative imports (`../_shared/cors.ts`)
 * keep working — this file is additive and tree-shakeable.
 *
 * Grouped by domain to prevent `../_shared/*` sprawl:
 * - HTTP: cors, api-handler, response-adapter, routing, pagination, health-handler
 * - Errors: errors, timeout, retry, error-tracking
 * - Observability: logger, metrics, performance, prometheus, deployment-metrics
 * - Security: csrf, rate-limiter, vault, webhook-security, url-validation
 * - Data & geo: cache, distance, supabase, geocoding, validation-rules
 * - Comms: telegram-client, telegram-alerts
 * - Storage: r2-storage, storage-constants, storage-urls, image-utils
 * - Utils: context, utils, transformers, aggregation, traced-fetch, toggle
 */

// HTTP (note: the handler family declares `HandlerRateLimitConfig`, which
// extends `rate-limiter.ts`'s `RateLimitConfig` — api-handler is re-exported
// selectively to keep the canonical `RateLimitConfig` unambiguous)
export * from "./cors.ts";
export {
  type APIHandlerConfig,
  createAPIHandler,
  created,
  type DeprecatedVersion,
  getRequestedVersion,
  type HandlerContext,
  noContent,
  ok,
  paginated,
  type RouteConfig,
  type RouteHandler,
} from "./api-handler.ts";
export * from "./errors.ts";
export * from "./pagination.ts";
export * from "./routing.ts";
export * from "./response-adapter.ts";
export * from "./health-handler.ts";

// Errors & resilience
export * from "./timeout.ts";
export * from "./retry.ts";
export * from "./error-tracking.ts";
export * from "./circuit-breaker.ts";

// Observability (note: metrics.ts and performance.ts both declare
// `getMetricsSummary` — canonical is metrics.ts; import performance.ts deep)
export * from "./logger.ts";
export * from "./metrics.ts";
export {
  clearSpans,
  getSpans,
  measureAsync,
  measureSync,
  type PerformanceMetric,
  PerformanceTimer,
  startSpan,
  trackQuery,
} from "./performance.ts";
export * from "./prometheus.ts";
export * from "./deployment-metrics.ts";

// Security (note: `HandlerRateLimitConfig` extends the canonical
// `RateLimitConfig` from rate-limiter.ts with keyBy/skip)
export * from "./csrf.ts";
export * from "./rate-limiter.ts";
export * from "./vault.ts";
export * from "./webhook-security.ts";
export * from "./url-validation.ts";

// Data & geo (note: distance.ts and geocoding.ts both declare `Coordinates` —
// canonical re-export is distance.ts; import geocoding.ts deep for its variant)
export * from "./cache.ts";
export * from "./distance.ts";
export * from "./supabase.ts";
export {
  cleanupCache,
  geocodeAddress,
  geocodeWithCountryFallback,
  getCacheStats,
} from "./geocoding.ts";
export * from "./validation-rules.ts";
export * from "./feature-flags.ts";
export * from "./location-privacy.ts";
export * from "./notification-preferences.ts";

// Comms
export * from "./telegram-client.ts";
export * from "./telegram-alerts.ts";

// Storage
export * from "./r2-storage.ts";
export * from "./storage-constants.ts";
export * from "./storage-urls.ts";
export * from "./image-utils.ts";

// Infra & utils (note: timeout.ts and utils.ts both declare `withTimeout` —
// canonical re-export is timeout.ts; import utils.ts deep for its variant)
export * from "./context.ts";
export * from "./timeout.ts";
export {
  deduplicate,
  generateRequestId,
  isDevelopment,
  processInParallel,
  retryWithJitter,
  slugify,
  timingSafeEqual,
} from "./utils.ts";
export * from "./transformers.ts";
export * from "./aggregation.ts";
export * from "./traced-fetch.ts";
export * from "./post-engagement.ts";
export * from "./placeholder-config.ts";
export * from "./aws-signer.ts";
export * from "./embeddings.ts";
export * from "./upstash-vector.ts";
export * from "./message-encryption.ts";
export * from "./display-name.ts";
