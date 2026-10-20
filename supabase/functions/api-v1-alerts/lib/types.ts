/**
 * Alerts Types
 *
 * Alert condition/result/threshold shapes.
 * Extracted from `api-v1-alerts/index.ts` — no changes.
 */

export type AlertType =
  | "error_rate_high"
  | "latency_high"
  | "circuit_breaker_open"
  | "login_spike"
  | "vault_failures"
  | "connection_pool_exhaustion"
  | "service_unhealthy";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertCondition {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  details?: Record<string, unknown>;
}

export interface AlertResult {
  checked_at: string;
  alerts_triggered: number;
  alerts: AlertCondition[];
  notifications_sent: string[];
}

export interface AlertThresholds {
  errorRatePercent: number;
  p95LatencyMs: number;
  failedLoginMultiplier: number;
  connectionPoolPercent: number;
  vaultFailuresPerHour: number;
}
