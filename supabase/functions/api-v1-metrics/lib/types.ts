/**
 * Metrics Types
 *
 * Web vitals + aggregate response shapes.
 * Extracted from `api-v1-metrics/index.ts` — no changes.
 */

export interface WebVitalsSummary {
  metric_name: string;
  sample_count: number;
  p50: number;
  p75: number;
  p95: number;
  good_pct: number;
  needs_improvement_pct: number;
  poor_pct: number;
}

export interface MetricsResponse {
  webVitals: WebVitalsSummary[];
  errorRate: {
    last5Min: number;
    last1Hour: number;
    last24Hours: number;
  };
  requestCount: {
    last5Min: number;
    last1Hour: number;
    last24Hours: number;
  };
  activeUsers: {
    last5Min: number;
    last1Hour: number;
    last24Hours: number;
  };
  timestamp: string;
}

/** Flat stat bundle fed to the Prometheus renderer. */
export interface MetricsStats {
  errorRate5m: number;
  errorRate1h: number;
  errorRate24h: number;
  activeUsers5m: number;
  activeUsers1h: number;
  activeUsers24h: number;
  requestCount5m: number;
  requestCount1h: number;
  requestCount24h: number;
}
