/**
 * Performance Metrics Collector
 *
 * Tracks client-side performance metrics:
 * - API latency (p50, p95, p99)
 * - Cache hit rates
 * - Realtime connection uptime
 * - Error rates by type
 * - Core Web Vitals
 *
 * @module lib/observability/metrics
 */

// =============================================================================
// Types
// =============================================================================

export interface APIMetrics {
  /** Total request count */
  requestCount: number;
  /** Successful request count */
  successCount: number;
  /** Failed request count */
  errorCount: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Average latency in ms */
  avgLatencyMs: number;
  /** P50 latency in ms */
  p50LatencyMs: number;
  /** P95 latency in ms */
  p95LatencyMs: number;
  /** P99 latency in ms */
  p99LatencyMs: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Requests by endpoint */
  byEndpoint: Record<string, EndpointMetrics>;
  /** Errors by code */
  byErrorCode: Record<string, number>;
}

export interface EndpointMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  latencies: number[];
}

export interface RealtimeMetricsData {
  /** Connection uptime percentage (0-100) */
  uptimePercent: number;
  /** Total connection time in ms */
  totalConnectionTimeMs: number;
  /** Total disconnection time in ms */
  totalDisconnectionTimeMs: number;
  /** Reconnection count */
  reconnectCount: number;
  /** Messages received */
  messagesReceived: number;
  /** Average message latency in ms */
  avgMessageLatencyMs: number;
}

export interface WebVitals {
  /** Time to First Byte */
  ttfb: number | null;
  /** First Contentful Paint */
  fcp: number | null;
  /** Largest Contentful Paint */
  lcp: number | null;
  /** First Input Delay */
  fid: number | null;
  /** Cumulative Layout Shift */
  cls: number | null;
  /** Interaction to Next Paint */
  inp: number | null;
}

export interface PerformanceMetrics {
  api: APIMetrics;
  realtime: RealtimeMetricsData;
  webVitals: WebVitals;
  /** Metrics collection start time */
  startedAt: number;
  /** Last updated time */
  updatedAt: number;
}

export interface MetricEvent {
  type: "api_request" | "api_error" | "cache_hit" | "cache_miss" | "realtime_message";
  endpoint?: string;
  latencyMs?: number;
  errorCode?: string;
  timestamp: number;
}

// =============================================================================
// Metrics Collector
// =============================================================================

class MetricsCollector {
  private apiLatencies: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private endpointMetrics = new Map<string, EndpointMetrics>();
  private errorCounts = new Map<string, number>();
  private requestCount = 0;
  private successCount = 0;
  private errorCount = 0;

  // Realtime metrics
  private realtimeConnectedAt: number | null = null;
  private realtimeTotalConnectedMs = 0;
  private realtimeTotalDisconnectedMs = 0;
  private realtimeReconnectCount = 0;
  private realtimeMessageCount = 0;
  private realtimeMessageLatencies: number[] = [];

  // Web Vitals
  private webVitals: WebVitals = {
    ttfb: null,
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    inp: null,
  };

  private startedAt = Date.now();
  private maxLatencyHistory = 1000;

  constructor() {
    this.initWebVitals();
  }

  /**
   * Initialize Web Vitals collection
   */
  private initWebVitals(): void {
    if (typeof window === "undefined") return;

    // Use Performance Observer for Web Vitals
    try {
      // TTFB
      const navigationEntries = performance.getEntriesByType("navigation");
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0] as PerformanceNavigationTiming;
        this.webVitals.ttfb = nav.responseStart - nav.requestStart;
      }

      // FCP
      const paintEntries = performance.getEntriesByType("paint");
      const fcpEntry = paintEntries.find((e) => e.name === "first-contentful-paint");
      if (fcpEntry) {
        this.webVitals.fcp = fcpEntry.startTime;
      }

      // LCP Observer
      if ("PerformanceObserver" in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.webVitals.lcp = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

        // CLS Observer
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput) {
              clsValue += (entry as PerformanceEntry & { value?: number }).value || 0;
            }
          }
          this.webVitals.cls = clsValue;
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });

        // FID Observer
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const firstEntry = entries[0] as PerformanceEntry & { processingStart?: number };
            this.webVitals.fid = firstEntry.processingStart
              ? firstEntry.processingStart - firstEntry.startTime
              : null;
          }
        });
        fidObserver.observe({ type: "first-input", buffered: true });
      }
    } catch (error) {
      console.warn("[Metrics] Failed to initialize Web Vitals:", error);
    }
  }

  /**
   * Record an API request
   */
  recordAPIRequest(endpoint: string, latencyMs: number, success: boolean, errorCode?: string): void {
    this.requestCount++;
    this.apiLatencies.push(latencyMs);

    // Trim history
    if (this.apiLatencies.length > this.maxLatencyHistory) {
      this.apiLatencies.shift();
    }

    if (success) {
      this.successCount++;
    } else {
      this.errorCount++;
      if (errorCode) {
        this.errorCounts.set(errorCode, (this.errorCounts.get(errorCode) || 0) + 1);
      }
    }

    // Update endpoint metrics
    let endpointData = this.endpointMetrics.get(endpoint);
    if (!endpointData) {
      endpointData = {
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        avgLatencyMs: 0,
        latencies: [],
      };
      this.endpointMetrics.set(endpoint, endpointData);
    }

    endpointData.requestCount++;
    endpointData.latencies.push(latencyMs);
    if (endpointData.latencies.length > 100) {
      endpointData.latencies.shift();
    }
    endpointData.avgLatencyMs =
      endpointData.latencies.reduce((a, b) => a + b, 0) / endpointData.latencies.length;

    if (success) {
      endpointData.successCount++;
    } else {
      endpointData.errorCount++;
    }
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record realtime connection
   */
  recordRealtimeConnected(): void {
    if (this.realtimeConnectedAt === null) {
      this.realtimeConnectedAt = Date.now();
    }
  }

  /**
   * Record realtime disconnection
   */
  recordRealtimeDisconnected(): void {
    if (this.realtimeConnectedAt !== null) {
      this.realtimeTotalConnectedMs += Date.now() - this.realtimeConnectedAt;
      this.realtimeConnectedAt = null;
    }
  }

  /**
   * Record realtime reconnection
   */
  recordRealtimeReconnect(): void {
    this.realtimeReconnectCount++;
  }

  /**
   * Record realtime message
   */
  recordRealtimeMessage(latencyMs?: number): void {
    this.realtimeMessageCount++;
    if (latencyMs !== undefined) {
      this.realtimeMessageLatencies.push(latencyMs);
      if (this.realtimeMessageLatencies.length > 100) {
        this.realtimeMessageLatencies.shift();
      }
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const totalRealtimeTime = this.realtimeTotalConnectedMs + this.realtimeTotalDisconnectedMs;

    // Calculate current connected time if still connected
    let currentConnectedMs = this.realtimeTotalConnectedMs;
    if (this.realtimeConnectedAt !== null) {
      currentConnectedMs += Date.now() - this.realtimeConnectedAt;
    }

    const byEndpoint: Record<string, EndpointMetrics> = {};
    for (const [endpoint, metrics] of this.endpointMetrics) {
      byEndpoint[endpoint] = { ...metrics };
    }

    const byErrorCode: Record<string, number> = {};
    for (const [code, count] of this.errorCounts) {
      byErrorCode[code] = count;
    }

    return {
      api: {
        requestCount: this.requestCount,
        successCount: this.successCount,
        errorCount: this.errorCount,
        errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
        avgLatencyMs:
          this.apiLatencies.length > 0
            ? this.apiLatencies.reduce((a, b) => a + b, 0) / this.apiLatencies.length
            : 0,
        p50LatencyMs: this.percentile(this.apiLatencies, 50),
        p95LatencyMs: this.percentile(this.apiLatencies, 95),
        p99LatencyMs: this.percentile(this.apiLatencies, 99),
        cacheHitRate: totalCacheRequests > 0 ? this.cacheHits / totalCacheRequests : 0,
        byEndpoint,
        byErrorCode,
      },
      realtime: {
        uptimePercent:
          totalRealtimeTime > 0 ? (currentConnectedMs / totalRealtimeTime) * 100 : 100,
        totalConnectionTimeMs: currentConnectedMs,
        totalDisconnectionTimeMs: this.realtimeTotalDisconnectedMs,
        reconnectCount: this.realtimeReconnectCount,
        messagesReceived: this.realtimeMessageCount,
        avgMessageLatencyMs:
          this.realtimeMessageLatencies.length > 0
            ? this.realtimeMessageLatencies.reduce((a, b) => a + b, 0) /
              this.realtimeMessageLatencies.length
            : 0,
      },
      webVitals: { ...this.webVitals },
      startedAt: this.startedAt,
      updatedAt: Date.now(),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.apiLatencies = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.endpointMetrics.clear();
    this.errorCounts.clear();
    this.requestCount = 0;
    this.successCount = 0;
    this.errorCount = 0;
    this.realtimeConnectedAt = null;
    this.realtimeTotalConnectedMs = 0;
    this.realtimeTotalDisconnectedMs = 0;
    this.realtimeReconnectCount = 0;
    this.realtimeMessageCount = 0;
    this.realtimeMessageLatencies = [];
    this.startedAt = Date.now();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let collector: MetricsCollector | null = null;

/**
 * Get the metrics collector instance
 */
export function getMetricsCollector(): MetricsCollector {
  if (!collector) {
    collector = new MetricsCollector();
  }
  return collector;
}

/**
 * Record an API request
 */
export function recordAPIRequest(
  endpoint: string,
  latencyMs: number,
  success: boolean,
  errorCode?: string
): void {
  getMetricsCollector().recordAPIRequest(endpoint, latencyMs, success, errorCode);
}

/**
 * Record a cache hit
 */
export function recordCacheHit(): void {
  getMetricsCollector().recordCacheHit();
}

/**
 * Record a cache miss
 */
export function recordCacheMiss(): void {
  getMetricsCollector().recordCacheMiss();
}

/**
 * Record realtime connection
 */
export function recordRealtimeConnected(): void {
  getMetricsCollector().recordRealtimeConnected();
}

/**
 * Record realtime disconnection
 */
export function recordRealtimeDisconnected(): void {
  getMetricsCollector().recordRealtimeDisconnected();
}

/**
 * Record realtime reconnection
 */
export function recordRealtimeReconnect(): void {
  getMetricsCollector().recordRealtimeReconnect();
}

/**
 * Record realtime message
 */
export function recordRealtimeMessage(latencyMs?: number): void {
  getMetricsCollector().recordRealtimeMessage(latencyMs);
}

/**
 * Get all performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return getMetricsCollector().getMetrics();
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  getMetricsCollector().reset();
}

// Expose in development
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).performanceMetrics = getPerformanceMetrics;
}
