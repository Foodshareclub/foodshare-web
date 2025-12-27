/**
 * TypeScript interfaces for Admin Insights
 */

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalListings: number;
  activeListings: number;
  newListings7d: number;
  newListings30d: number;
  totalMessages: number;
  listingsByCategory: Record<string, number>;
  averageViews: number;
}

export interface ChurnData {
  totalUsers: number;
  atRiskUsers: number;
  churnRate: number;
}

export interface EmailCampaignData {
  totalEmails: number;
  successRate: number;
  bestSendTime: string;
  providerStats: Record<string, number>;
}

export interface VaultSecret {
  name: string;
  value: string;
}

/**
 * Circuit breaker states
 */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
}

export interface ErrorClassification {
  isRateLimit: boolean;
  isTransient: boolean;
  isTimeout: boolean;
  isNetworkError: boolean;
  retryAfter?: number;
  shouldRetry: boolean;
}
