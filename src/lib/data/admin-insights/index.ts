/**
 * Admin AI Insights Data Layer
 * Server-side only - contains API keys
 * Supports both direct xAI API and Vercel AI Gateway
 */

// Export all types
export type {
  PlatformMetrics,
  ChurnData,
  EmailCampaignData,
  VaultSecret,
  CircuitState,
  CircuitBreaker,
  QueuedRequest,
  ErrorClassification,
} from "./types";

// Export configuration
export { MODELS, CACHE_TTL, CIRCUIT_BREAKER_CONFIG, RATE_LIMIT_CONFIG } from "./config";

// Export API key management
export { getAiApiKey } from "./api-key";

// Export platform metrics
export { getPlatformMetrics, getChurnData, getEmailCampaignData } from "./platform-metrics";

// Export rate limiter
export {
  executeWithRateLimitHandling,
  queueRequest,
  getRateLimiterStatus,
  resetCircuitBreaker,
  classifyError,
} from "./rate-limiter";

// Export AI insights
export { getGrokInsights, getSuggestedQuestions, clearInsightCache } from "./ai-insights";

// Export deep analysis
export { getDeepAnalysis, shouldUseDeepAnalysis } from "./deep-analysis";
