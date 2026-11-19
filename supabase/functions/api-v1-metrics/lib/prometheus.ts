/**
 * Prometheus Text Renderer
 *
 * Exposition-format (`text/plain; version=0.0.4`) serialization.
 * Extracted from `api-v1-metrics/index.ts` — no logic changes.
 */

import type { MetricsStats, WebVitalsSummary } from "./types.ts";

export function generatePrometheusMetrics(
  webVitals: WebVitalsSummary[],
  stats: MetricsStats,
): string {
  const lines: string[] = [];
  const timestamp = Date.now();

  // Web Vitals metrics
  lines.push("# HELP foodshare_web_vitals_p50 Web Vitals 50th percentile");
  lines.push("# TYPE foodshare_web_vitals_p50 gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_p50{metric="${vital.metric_name}"} ${vital.p50 || 0} ${timestamp}`,
    );
  }

  lines.push("");
  lines.push("# HELP foodshare_web_vitals_p75 Web Vitals 75th percentile");
  lines.push("# TYPE foodshare_web_vitals_p75 gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_p75{metric="${vital.metric_name}"} ${vital.p75 || 0} ${timestamp}`,
    );
  }

  lines.push("");
  lines.push("# HELP foodshare_web_vitals_p95 Web Vitals 95th percentile");
  lines.push("# TYPE foodshare_web_vitals_p95 gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_p95{metric="${vital.metric_name}"} ${vital.p95 || 0} ${timestamp}`,
    );
  }

  lines.push("");
  lines.push(
    "# HELP foodshare_web_vitals_sample_count Number of samples per metric",
  );
  lines.push("# TYPE foodshare_web_vitals_sample_count gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_sample_count{metric="${vital.metric_name}"} ${
        vital.sample_count || 0
      } ${timestamp}`,
    );
  }

  lines.push("");
  lines.push("# HELP foodshare_web_vitals_good_pct Percentage of good ratings");
  lines.push("# TYPE foodshare_web_vitals_good_pct gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_good_pct{metric="${vital.metric_name}"} ${
        vital.good_pct || 0
      } ${timestamp}`,
    );
  }

  lines.push("");
  lines.push("# HELP foodshare_web_vitals_poor_pct Percentage of poor ratings");
  lines.push("# TYPE foodshare_web_vitals_poor_pct gauge");
  for (const vital of webVitals) {
    lines.push(
      `foodshare_web_vitals_poor_pct{metric="${vital.metric_name}"} ${
        vital.poor_pct || 0
      } ${timestamp}`,
    );
  }

  // Error rates
  lines.push("");
  lines.push("# HELP foodshare_error_rate Error rate as decimal (0-1)");
  lines.push("# TYPE foodshare_error_rate gauge");
  lines.push(
    `foodshare_error_rate{window="5m"} ${stats.errorRate5m} ${timestamp}`,
  );
  lines.push(
    `foodshare_error_rate{window="1h"} ${stats.errorRate1h} ${timestamp}`,
  );
  lines.push(
    `foodshare_error_rate{window="24h"} ${stats.errorRate24h} ${timestamp}`,
  );

  // Active users
  lines.push("");
  lines.push("# HELP foodshare_active_users Number of active users");
  lines.push("# TYPE foodshare_active_users gauge");
  lines.push(
    `foodshare_active_users{window="5m"} ${stats.activeUsers5m} ${timestamp}`,
  );
  lines.push(
    `foodshare_active_users{window="1h"} ${stats.activeUsers1h} ${timestamp}`,
  );
  lines.push(
    `foodshare_active_users{window="24h"} ${stats.activeUsers24h} ${timestamp}`,
  );

  // Request counts
  lines.push("");
  lines.push("# HELP foodshare_request_count Total API requests");
  lines.push("# TYPE foodshare_request_count gauge");
  lines.push(
    `foodshare_request_count{window="5m"} ${stats.requestCount5m} ${timestamp}`,
  );
  lines.push(
    `foodshare_request_count{window="1h"} ${stats.requestCount1h} ${timestamp}`,
  );
  lines.push(
    `foodshare_request_count{window="24h"} ${stats.requestCount24h} ${timestamp}`,
  );

  // Service info
  lines.push("");
  lines.push("# HELP foodshare_info Service information");
  lines.push("# TYPE foodshare_info gauge");
  lines.push(
    `foodshare_info{version="${
      Deno.env.get("SUPABASE_FUNCTION_VERSION") || "2.0.0"
    }"} 1 ${timestamp}`,
  );

  return lines.join("\n");
}
