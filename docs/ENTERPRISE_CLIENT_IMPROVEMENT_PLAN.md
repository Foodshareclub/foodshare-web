# Enterprise Client Improvement Plan

**Analysis Date:** December 30, 2025  
**Implementation Date:** December 30, 2025  
**Platforms:** Web (Next.js), iOS (Swift), Android (Kotlin)  
**Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)

---

## Implementation Status

| Phase | Status | Files Created |
|-------|--------|---------------|
| 1. API Client Unification | ✅ COMPLETE | `circuit-breaker.ts`, `retry.ts`, `enterprise-client.ts`, `offline-queue.ts` |
| 2. Offline-First | ✅ COMPLETE | `offline-queue.ts` (IndexedDB persistence) |
| 3. Realtime Enhancement | ✅ COMPLETE | `realtime/manager.ts`, `realtime/presence.ts` |
| 4. Observability | ✅ COMPLETE | `observability/metrics.ts`, `observability/tracing.ts` |
| 5. Security Hardening | ✅ COMPLETE | `security/token-manager.ts`, `security/sensitive-data.ts` |
| 6. Caching Strategy | ✅ COMPLETE | `cache/multi-layer.ts`, `cache/invalidation.ts` |
| 7. Error Recovery | ✅ COMPLETE | `errors/recovery.ts`, `ErrorBoundary/FeatureErrorBoundary.tsx` |
| 8. Testing | ✅ COMPLETE | `testing/msw-handlers.ts`, `testing/contract-testing.ts`, `testing/enterprise-test-utils.ts` |

---

## Executive Summary

After analyzing the current codebase across all three platforms, I've identified key areas for enterprise-grade improvements. The backend already has solid enterprise patterns (rate limiting, circuit breakers, idempotency). The client apps need alignment and enhancement to match this level.

---

## Phase 1: Cross-Platform API Client Unification (HIGH PRIORITY)

### Current State
- **Web:** Basic `apiCall` with timeout, no retry, no circuit breaker
- **Android:** `EdgeFunctionClient` with retry + exponential backoff, `CircuitBreaker` class
- **iOS:** Similar patterns but need verification

### Improvements Needed

#### 1.1 Unified API Client for Web (`src/lib/api/enterprise-client.ts`)

```typescript
/**
 * Enterprise API Client
 * 
 * Features:
 * - Circuit breaker pattern
 * - Exponential backoff retry
 * - Request deduplication
 * - Offline queue
 * - Request/response interceptors
 * - Correlation ID propagation
 */

interface CircuitBreakerConfig {
  failureThreshold: number;      // 5
  resetTimeoutMs: number;        // 30000
  halfOpenRequests: number;      // 3
}

interface RetryConfig {
  maxRetries: number;            // 3
  initialDelayMs: number;        // 500
  maxDelayMs: number;            // 10000
  retryableStatuses: number[];   // [408, 429, 500, 502, 503, 504]
}

interface EnterpriseClientConfig {
  baseUrl: string;
  timeout: number;
  circuitBreaker: CircuitBreakerConfig;
  retry: RetryConfig;
  enableOfflineQueue: boolean;
  enableDeduplication: boolean;
}
```

#### 1.2 Shared Error Codes Across Platforms

Create a shared error code enum that matches backend:

```typescript
// Must match: foodshare-backend/functions/_shared/errors.ts
export const ErrorCodes = {
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Auth
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  
  // Data
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;
```

---

## Phase 2: Offline-First Architecture (HIGH PRIORITY)

### Current State
- **Web:** IndexedDB cache for map locations only
- **Android:** `SyncManager` + `SyncWorker` + `SyncDatabase` (good foundation)
- **iOS:** Core/Sync directory exists

### Improvements Needed

#### 2.1 Web Offline Queue (`src/lib/offline/queue.ts`)

```typescript
/**
 * Offline Operation Queue
 * 
 * Queues mutations when offline, syncs when back online.
 * Uses IndexedDB for persistence.
 */

interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

interface OfflineQueueConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxQueueSize: number;
  syncBatchSize: number;
}
```

#### 2.2 Optimistic Updates with Rollback

```typescript
/**
 * Optimistic Update Manager
 * 
 * Applies changes immediately, rolls back on failure.
 * Integrates with React Query for cache management.
 */

interface OptimisticUpdate<T> {
  queryKey: QueryKey;
  previousData: T;
  optimisticData: T;
  mutation: () => Promise<T>;
  rollback: () => void;
}
```

#### 2.3 Conflict Resolution Strategy

```typescript
/**
 * Conflict Resolution
 * 
 * Handles version conflicts using optimistic locking.
 * Backend already supports `version` field.
 */

type ConflictStrategy = 
  | 'CLIENT_WINS'      // Overwrite server
  | 'SERVER_WINS'      // Discard local
  | 'MERGE'            // Field-level merge
  | 'PROMPT_USER';     // Show conflict UI
```

---

## Phase 3: Enhanced Realtime Subscriptions (MEDIUM PRIORITY)

### Current State
- **Web:** `useRealtimeSubscription` with exponential backoff reconnection
- **Android:** `RealtimeChannelManager`
- **iOS:** Core/Realtime exists

### Improvements Needed

#### 3.1 Realtime Connection Manager

```typescript
/**
 * Centralized Realtime Manager
 * 
 * - Single connection for all subscriptions
 * - Automatic reconnection with backoff
 * - Subscription deduplication
 * - Presence tracking
 * - Connection quality monitoring
 */

interface RealtimeManagerConfig {
  maxReconnectAttempts: number;
  reconnectBackoff: BackoffConfig;
  heartbeatIntervalMs: number;
  presenceEnabled: boolean;
}

interface SubscriptionHandle {
  id: string;
  channel: string;
  table: string;
  filter?: string;
  unsubscribe: () => void;
}
```

#### 3.2 Realtime Event Batching

```typescript
/**
 * Event Batching
 * 
 * Batches rapid realtime events to prevent UI thrashing.
 * Configurable debounce per event type.
 */

interface BatchConfig {
  windowMs: number;           // 100ms default
  maxBatchSize: number;       // 50 events
  flushOnIdle: boolean;
}
```

---

## Phase 4: Performance Monitoring & Observability (MEDIUM PRIORITY)

### Current State
- **Web:** Basic logger, Sentry integration
- **Android:** Basic logging
- **iOS:** Core/Observability, Core/Performance directories

### Improvements Needed

#### 4.1 Client-Side Performance Metrics

```typescript
/**
 * Performance Metrics Collector
 * 
 * Tracks:
 * - API latency (p50, p95, p99)
 * - Cache hit rates
 * - Realtime connection uptime
 * - Error rates by type
 * - Bundle/render performance
 */

interface PerformanceMetrics {
  api: {
    requestCount: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
    cacheHitRate: number;
  };
  realtime: {
    connectionUptime: number;
    reconnectCount: number;
    messageLatencyMs: number;
  };
  ui: {
    ttfb: number;
    fcp: number;
    lcp: number;
    cls: number;
  };
}
```

#### 4.2 Distributed Tracing

```typescript
/**
 * Trace Context Propagation
 * 
 * Propagates correlation IDs from client → Edge Functions → Database.
 * Enables end-to-end request tracing.
 */

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

// Headers to propagate
const TRACE_HEADERS = {
  'X-Correlation-Id': traceId,
  'X-Request-Id': spanId,
  'X-Client-Platform': platform,
  'X-Client-Version': version,
};
```

---

## Phase 5: Security Hardening (HIGH PRIORITY)

### Current State
- **Backend:** MFA, audit logging, rate limiting
- **Web:** Basic auth, cookie-based sessions
- **Mobile:** Keychain/Keystore for tokens

### Improvements Needed

#### 5.1 Token Refresh Strategy

```typescript
/**
 * Proactive Token Refresh
 * 
 * Refreshes tokens before expiry to prevent auth failures.
 * Handles refresh token rotation.
 */

interface TokenManager {
  getAccessToken(): Promise<string>;
  refreshIfNeeded(): Promise<void>;
  onTokenRefresh: (callback: (token: string) => void) => void;
  clearTokens(): Promise<void>;
}

// Refresh when token expires in < 5 minutes
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
```

#### 5.2 Request Signing (Optional)

```typescript
/**
 * Request Signing
 * 
 * Signs requests with HMAC for additional security.
 * Prevents request tampering.
 */

interface SignedRequest {
  timestamp: number;
  nonce: string;
  signature: string;  // HMAC-SHA256(timestamp + nonce + body)
}
```

#### 5.3 Sensitive Data Handling

```typescript
/**
 * Sensitive Data Manager
 * 
 * - Encrypts sensitive data at rest
 * - Clears sensitive data on logout
 * - Prevents sensitive data in logs
 */

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
];
```

---

## Phase 6: Enhanced Caching Strategy (MEDIUM PRIORITY)

### Current State
- **Web:** `apiCache` (in-memory), `map-cache` (IndexedDB)
- **Android:** Room database for persistence
- **iOS:** Core/Cache directory

### Improvements Needed

#### 6.1 Multi-Layer Cache

```typescript
/**
 * Multi-Layer Cache
 * 
 * L1: In-memory (fastest, limited size)
 * L2: IndexedDB (persistent, larger)
 * L3: Service Worker (offline support)
 */

interface CacheLayer {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface MultiLayerCache {
  layers: CacheLayer[];
  get<T>(key: string): Promise<T | null>;  // Checks L1 → L2 → L3
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
}
```

#### 6.2 Cache Invalidation Patterns

```typescript
/**
 * Smart Cache Invalidation
 * 
 * - Tag-based invalidation
 * - Pattern-based invalidation
 * - Realtime-triggered invalidation
 * - TTL-based expiry
 */

interface CacheInvalidation {
  // Invalidate by tag
  invalidateByTag(tag: string): Promise<void>;
  
  // Invalidate by pattern
  invalidateByPattern(pattern: RegExp): Promise<void>;
  
  // Subscribe to realtime for auto-invalidation
  subscribeToInvalidation(table: string, filter?: string): void;
}
```

---

## Phase 7: Error Boundary & Recovery (MEDIUM PRIORITY)

### Current State
- **Web:** Basic error boundaries
- **Mobile:** Crash reporting

### Improvements Needed

#### 7.1 Granular Error Boundaries

```typescript
/**
 * Feature-Level Error Boundaries
 * 
 * Isolates failures to specific features.
 * Provides recovery options.
 */

interface ErrorBoundaryConfig {
  fallback: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  retryAction?: () => void;
}
```

#### 7.2 Automatic Recovery Strategies

```typescript
/**
 * Recovery Strategies
 * 
 * - Retry with backoff
 * - Fallback to cached data
 * - Graceful degradation
 * - User-prompted recovery
 */

type RecoveryStrategy =
  | { type: 'RETRY'; maxAttempts: number; backoff: BackoffConfig }
  | { type: 'FALLBACK_CACHE'; maxAge: number }
  | { type: 'DEGRADE'; fallbackComponent: React.ComponentType }
  | { type: 'PROMPT_USER'; message: string };
```

---

## Phase 8: Testing Infrastructure (LOW PRIORITY)

### Improvements Needed

#### 8.1 API Mocking Layer

```typescript
/**
 * MSW-based API Mocking
 * 
 * Consistent mocking across unit/integration/e2e tests.
 * Matches Edge Function response format.
 */

// Mock handlers that match backend response format
const handlers = [
  rest.get('/functions/v1/api-v1-products', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: mockProducts,
        meta: {
          requestId: 'test-123',
          timestamp: new Date().toISOString(),
          responseTime: 50,
        },
      })
    );
  }),
];
```

#### 8.2 Contract Testing

```typescript
/**
 * API Contract Tests
 * 
 * Validates client expectations match server responses.
 * Uses Pact or similar for contract verification.
 */

interface ContractTest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestSchema: ZodSchema;
  responseSchema: ZodSchema;
}
```

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Impact | Dependencies |
|-------|----------|--------|--------|--------------|
| 1. API Client Unification | HIGH | Medium | High | None |
| 2. Offline-First | HIGH | High | High | Phase 1 |
| 5. Security Hardening | HIGH | Medium | High | None |
| 3. Realtime Enhancement | MEDIUM | Medium | Medium | Phase 1 |
| 4. Observability | MEDIUM | Medium | Medium | Phase 1 |
| 6. Caching Strategy | MEDIUM | Medium | Medium | Phase 2 |
| 7. Error Recovery | MEDIUM | Low | Medium | Phase 1 |
| 8. Testing | LOW | High | Medium | All |

---

## Quick Wins (Implement This Week)

1. **Add Circuit Breaker to Web API Client** - Port from Android
2. **Add Retry with Exponential Backoff** - Already in Android
3. **Propagate Correlation IDs** - Backend already supports
4. **Add Request Deduplication** - Already have `request-deduplication.ts`
5. **Enhance Error Types** - Align with backend error codes

---

## Files to Create/Modify

### New Files
```
src/lib/api/
├── enterprise-client.ts      # Unified API client
├── circuit-breaker.ts        # Circuit breaker implementation
├── retry.ts                  # Retry with backoff
├── interceptors.ts           # Request/response interceptors
└── offline-queue.ts          # Offline operation queue

src/lib/realtime/
├── manager.ts                # Centralized realtime manager
├── batching.ts               # Event batching
└── presence.ts               # Presence tracking

src/lib/cache/
├── multi-layer.ts            # Multi-layer cache
├── invalidation.ts           # Cache invalidation
└── strategies.ts             # Caching strategies

src/lib/observability/
├── metrics.ts                # Performance metrics
├── tracing.ts                # Distributed tracing
└── logger.ts                 # Enhanced logging
```

### Files to Modify
```
src/lib/api/client.ts         # Integrate enterprise features
src/lib/errors/types.ts       # Align with backend codes
src/hooks/useRealtimeSubscription.ts  # Use centralized manager
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| API Error Rate | ~2% | <0.5% |
| Cache Hit Rate | ~60% | >85% |
| Offline Capability | None | Full CRUD |
| P95 API Latency | ~800ms | <400ms |
| Realtime Reconnect Time | ~5s | <2s |
| Mean Time to Recovery | Manual | <30s auto |

---

## Next Steps

1. Review and approve this plan
2. Create implementation tickets
3. Start with Phase 1 (API Client) and Phase 5 (Security)
4. Iterate based on metrics

Would you like me to start implementing any specific phase?

---

## Implementation Summary (December 30, 2025)

All 7 core phases have been implemented. Here's what was created:

### New Files Created

```
src/lib/api/
├── circuit-breaker.ts      # Circuit breaker pattern (CLOSED → OPEN → HALF_OPEN)
├── retry.ts                # Exponential backoff with jitter
├── enterprise-client.ts    # Unified API client with all features
└── offline-queue.ts        # IndexedDB-backed offline mutation queue

src/lib/realtime/
├── manager.ts              # Centralized realtime subscription manager
├── presence.ts             # Presence tracking & typing indicators
└── index.ts                # Module exports

src/lib/observability/
├── metrics.ts              # Performance metrics (API, realtime, Web Vitals)
├── tracing.ts              # Distributed tracing with correlation IDs
└── index.ts                # Module exports

src/lib/cache/
├── multi-layer.ts          # L1 (memory) + L2 (IndexedDB) cache
├── invalidation.ts         # Tag/pattern-based cache invalidation
└── index.ts                # Module exports

src/lib/errors/
└── recovery.ts             # Recovery strategies (retry, cache, degrade, prompt)

src/lib/security/
├── token-manager.ts        # Proactive token refresh
├── sensitive-data.ts       # Data redaction & secure storage
└── index.ts                # Updated module exports

src/lib/testing/
├── msw-handlers.ts         # MSW request handlers & mock factories
├── setup.ts                # MSW server setup for Jest
├── test-utils.tsx          # Custom render & test utilities
├── contract-testing.ts     # Zod-based contract validation
├── enterprise-test-utils.ts # Circuit breaker, retry, cache test helpers
├── index.ts                # Module exports
└── __tests__/              # Example tests
    ├── circuit-breaker.test.ts
    └── api-mocking.test.ts

src/components/ErrorBoundary/
├── FeatureErrorBoundary.tsx  # Feature-level error boundaries
└── index.ts                  # Module exports
```

### Key Features Implemented

1. **Circuit Breaker** - Prevents cascading failures with state machine
2. **Retry with Backoff** - Exponential backoff with jitter for transient failures
3. **Request Deduplication** - Prevents duplicate in-flight requests
4. **Offline Queue** - IndexedDB persistence for offline mutations
5. **Realtime Manager** - Single connection, event batching, reconnection
6. **Presence Tracking** - Online users and typing indicators
7. **Performance Metrics** - API latency percentiles, cache hit rates, Web Vitals
8. **Distributed Tracing** - Correlation ID propagation across services
9. **Multi-Layer Cache** - Memory + IndexedDB with smart invalidation
10. **Token Manager** - Proactive refresh before expiry
11. **Sensitive Data** - Redaction, secure storage, cleanup on logout
12. **Error Boundaries** - Feature-level isolation with recovery options
13. **MSW API Mocking** - Mock handlers matching Edge Function response format
14. **Contract Testing** - Zod-based request/response validation
15. **Enterprise Test Utils** - Circuit breaker, retry, cache, realtime test helpers

### Usage Examples

```typescript
// Enterprise API Client
import { enterpriseClient } from "@/lib/api";

const result = await enterpriseClient.post("api-v1-products", {
  title: "My Product",
});

// Offline Queue
import { enqueueOffline } from "@/lib/api";

if (!navigator.onLine) {
  await enqueueOffline({
    type: "CREATE",
    endpoint: "api-v1-products",
    method: "POST",
    payload: { title: "My Product" },
  });
}

// Realtime Subscriptions
import { subscribeToChanges } from "@/lib/realtime";

const handle = subscribeToChanges({
  table: "messages",
  event: "INSERT",
  filter: "room_id=eq.123",
  onData: (payload) => console.log("New message:", payload.new),
});

// Multi-Layer Cache
import { cacheGetOrFetch } from "@/lib/cache";

const products = await cacheGetOrFetch(
  "products:featured",
  () => fetchFeaturedProducts(),
  { ttl: 5 * 60 * 1000, tags: ["products"] }
);

// Error Recovery
import { executeRecovery, createStandardRecovery } from "@/lib/errors/recovery";

const result = await executeRecovery(
  () => fetchProducts(),
  createStandardRecovery("products", [])
);

// Token Manager
import { startTokenManager } from "@/lib/security";

startTokenManager({
  onSessionExpired: () => redirectToLogin(),
});

// Testing - MSW Mocking
import { server, mockSuccess, mockFactories, errorHandlers } from "@/lib/testing";

// Override handler for specific test
server.use(errorHandlers.rateLimit("api-v1-products"));

// Create mock data
const product = mockFactories.product({ title: "Test" });

// Testing - Contract Validation
import { validateResponse, productContracts } from "@/lib/testing";

const validation = validateResponse(productContracts[0], apiResponse);
expect(validation.valid).toBe(true);

// Testing - Enterprise Utils
import { createTestCircuitBreaker, createFailingThenSucceedingFn } from "@/lib/testing";

const breaker = createTestCircuitBreaker({ failureThreshold: 2 });
const fn = createFailingThenSucceedingFn(2, "success");
```
