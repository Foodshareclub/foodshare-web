/**
 * Admin AI Insights Data Layer
 * Server-side only - contains API keys
 * Supports both direct xAI API and Vercel AI Gateway
 */

import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";

// Grok model configuration
const MODELS = {
  QUICK_INSIGHTS: "grok-3-mini",
  FAST_REASONING: "grok-3-mini", // Use grok-3-mini for all queries via AI Gateway
  DEEP_ANALYSIS: "grok-3-mini",
} as const;

// Cache for insights
const insightCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Cache for API key to avoid repeated vault lookups
const API_KEY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedApiKey: string | null = null;
let apiKeyCacheExpiry = 0;

interface VaultSecret {
  name: string;
  value: string;
}

/**
 * Get AI API key from environment variable or Supabase Vault
 * Checks for XAI_API_KEY first, then AI_GATEWAY_API_KEY
 */
async function getAiApiKey(): Promise<string | null> {
  // Check environment variables first (for local dev)
  if (process.env.XAI_API_KEY) {
    return process.env.XAI_API_KEY;
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return process.env.AI_GATEWAY_API_KEY;
  }

  // Check cache
  if (cachedApiKey && Date.now() < apiKeyCacheExpiry) {
    return cachedApiKey;
  }

  // Fetch from Supabase Vault
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_secrets", {
      secret_names: ["XAI_API_KEY", "AI_GATEWAY_API_KEY"],
    });

    if (error || !data || data.length === 0) {
      console.error("Failed to fetch AI API key from vault:", error?.message);
      return null;
    }

    const secrets = data as VaultSecret[];
    // Prefer XAI_API_KEY, fallback to AI_GATEWAY_API_KEY
    const xaiSecret = secrets.find((s) => s.name === "XAI_API_KEY");
    const gatewaySecret = secrets.find((s) => s.name === "AI_GATEWAY_API_KEY");

    const apiKey = xaiSecret?.value || gatewaySecret?.value;
    if (apiKey) {
      cachedApiKey = apiKey;
      apiKeyCacheExpiry = Date.now() + API_KEY_CACHE_TTL;
      return apiKey;
    }

    return null;
  } catch (err) {
    console.error("Error fetching secret from vault:", err);
    return null;
  }
}

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

/**
 * Get platform metrics from database
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const supabase = await createClient();

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [{ data: profiles }, { data: posts }, { count: messageCount }] = await Promise.all([
    supabase.from("profiles").select("id, created_time, last_seen_at"),
    supabase.from("posts").select("id, created_at, is_active, post_type, post_views"),
    supabase.from("messages").select("*", { count: "exact", head: true }),
  ]);

  const activeUsers7d =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last7Days).length ?? 0;

  const activeUsers30d =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) > last30Days).length ?? 0;

  const newListings7d = posts?.filter((l) => new Date(l.created_at) > last7Days).length ?? 0;

  const newListings30d = posts?.filter((l) => new Date(l.created_at) > last30Days).length ?? 0;

  const listingsByCategory = (posts ?? []).reduce((acc: Record<string, number>, l) => {
    const cat = l.post_type || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const totalViews = (posts ?? []).reduce((sum, l) => sum + (l.post_views || 0), 0);

  return {
    totalUsers: profiles?.length ?? 0,
    activeUsers7d,
    activeUsers30d,
    totalListings: posts?.length ?? 0,
    activeListings: posts?.filter((l) => l.is_active).length ?? 0,
    newListings7d,
    newListings30d,
    totalMessages: messageCount ?? 0,
    listingsByCategory,
    averageViews: posts?.length ? totalViews / posts.length : 0,
  };
}

/**
 * Get user churn data
 */
export async function getChurnData(): Promise<ChurnData> {
  const supabase = await createClient();

  const { data: profiles } = await supabase.from("profiles").select("id, last_seen_at");

  const now = new Date();
  const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const atRiskUsers =
    profiles?.filter((u) => u.last_seen_at && new Date(u.last_seen_at) < inactiveThreshold)
      .length ?? 0;

  const totalUsers = profiles?.length ?? 0;

  return {
    totalUsers,
    atRiskUsers,
    churnRate: totalUsers > 0 ? (atRiskUsers / totalUsers) * 100 : 0,
  };
}

/**
 * Get email campaign data
 */
export async function getEmailCampaignData(): Promise<EmailCampaignData | null> {
  const supabase = await createClient();

  const { data: emails, error } = await supabase
    .from("email_logs")
    .select("id, created_at, status, provider_used")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return null;

  const successRate = emails?.length
    ? (emails.filter((e) => e.status === "sent").length / emails.length) * 100
    : 100;

  const sendTimes = (emails ?? []).reduce((acc: Record<number, number>, email) => {
    const hour = new Date(email.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const bestSendTime = Object.entries(sendTimes).sort((a, b) => b[1] - a[1])[0]?.[0];

  const providerStats = (emails ?? []).reduce((acc: Record<string, number>, e) => {
    const provider = e.provider_used || "unknown";
    acc[provider] = (acc[provider] || 0) + 1;
    return acc;
  }, {});

  return {
    totalEmails: emails?.length ?? 0,
    successRate,
    bestSendTime: bestSendTime ? `${bestSendTime}:00` : "N/A",
    providerStats,
  };
}

/**
 * Select model based on query complexity
 */
function selectModel(query: string): string {
  const complexKeywords = ["predict", "analyze", "optimize", "recommend", "strategy", "detailed"];
  const isComplex = complexKeywords.some((keyword) => query.toLowerCase().includes(keyword));

  if (query.length > 200 || isComplex) {
    return MODELS.FAST_REASONING;
  }

  return MODELS.QUICK_INSIGHTS;
}

// ============================================================================
// ROBUST RATE LIMIT HANDLING WITH CIRCUIT BREAKER & REQUEST QUEUE
// ============================================================================

/**
 * Circuit breaker states
 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3, // Open circuit after 3 consecutive failures
  resetTimeoutMs: 30000, // Try again after 30 seconds
  halfOpenMaxAttempts: 1, // Allow 1 request in half-open state
} as const;

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  minIntervalMs: 2000, // Minimum 2 seconds between calls
  maxRetries: 5, // Maximum retry attempts
  baseDelayMs: 3000, // Base delay for exponential backoff
  maxDelayMs: 60000, // Maximum delay cap (60 seconds)
  jitterFactor: 0.3, // Add up to 30% random jitter
  requestTimeoutMs: 30000, // Timeout for individual requests
  queueTimeoutMs: 120000, // Max time a request can wait in queue
} as const;

// Global state
let lastApiCallTime = 0;
let circuitBreaker: CircuitBreaker = {
  state: "CLOSED",
  failures: 0,
  lastFailureTime: 0,
  nextRetryTime: 0,
};
const requestQueue: QueuedRequest<unknown>[] = [];
let isProcessingQueue = false;

/**
 * Sleep helper with optional abort signal
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Sleep aborted"));
    });
  });
}

/**
 * Add jitter to delay to prevent thundering herd
 */
function addJitter(delayMs: number): number {
  const jitter = delayMs * RATE_LIMIT_CONFIG.jitterFactor * Math.random();
  return Math.floor(delayMs + jitter);
}

/**
 * Calculate exponential backoff delay with jitter and cap
 */
function calculateBackoffDelay(attempt: number, retryAfterHeader?: number): number {
  // If server provided Retry-After, use it
  if (retryAfterHeader && retryAfterHeader > 0) {
    return Math.min(retryAfterHeader * 1000, RATE_LIMIT_CONFIG.maxDelayMs);
  }

  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = RATE_LIMIT_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RATE_LIMIT_CONFIG.maxDelayMs);
  return addJitter(cappedDelay);
}

/**
 * Classify error type for appropriate handling
 */
interface ErrorClassification {
  isRateLimit: boolean;
  isTransient: boolean;
  isTimeout: boolean;
  isNetworkError: boolean;
  retryAfter?: number;
  shouldRetry: boolean;
}

function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  const errorStr = String(error);

  // Extract Retry-After if present
  const retryAfterMatch = errorStr.match(/retry[- ]?after[:\s]*(\d+)/i);
  const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : undefined;

  const isRateLimit =
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("quota exceeded") ||
    message.includes("throttl");

  const isTimeout =
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("etimedout") ||
    message.includes("econnreset");

  const isNetworkError =
    message.includes("network") ||
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("fetch failed") ||
    message.includes("socket hang up");

  const isTransient =
    isRateLimit ||
    isTimeout ||
    isNetworkError ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("service unavailable") ||
    message.includes("internal server error");

  // Don't retry auth errors, bad requests, or permanent failures
  const isPermanentError =
    message.includes("401") ||
    message.includes("403") ||
    message.includes("400") ||
    message.includes("invalid api key") ||
    message.includes("unauthorized") ||
    message.includes("forbidden");

  return {
    isRateLimit,
    isTransient,
    isTimeout,
    isNetworkError,
    retryAfter,
    shouldRetry: isTransient && !isPermanentError,
  };
}

/**
 * Update circuit breaker state based on result
 */
function recordSuccess(): void {
  circuitBreaker = {
    state: "CLOSED",
    failures: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };
}

function recordFailure(): void {
  const now = Date.now();
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = now;

  if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    circuitBreaker.state = "OPEN";
    circuitBreaker.nextRetryTime = now + CIRCUIT_BREAKER_CONFIG.resetTimeoutMs;
    console.warn(
      `[xAI Circuit Breaker] OPEN - Too many failures. Will retry after ${new Date(circuitBreaker.nextRetryTime).toISOString()}`
    );
  }
}

/**
 * Check if circuit breaker allows request
 */
function canMakeRequest(): { allowed: boolean; waitMs?: number; reason?: string } {
  const now = Date.now();

  if (circuitBreaker.state === "CLOSED") {
    return { allowed: true };
  }

  if (circuitBreaker.state === "OPEN") {
    if (now >= circuitBreaker.nextRetryTime) {
      // Transition to half-open
      circuitBreaker.state = "HALF_OPEN";
      console.warn("[xAI Circuit Breaker] HALF_OPEN - Testing with single request");
      return { allowed: true };
    }
    return {
      allowed: false,
      waitMs: circuitBreaker.nextRetryTime - now,
      reason: "Circuit breaker is OPEN due to repeated failures",
    };
  }

  // HALF_OPEN - allow limited requests
  return { allowed: true };
}

/**
 * Process queued requests sequentially
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (requestQueue.length > 0) {
      const request = requestQueue[0];
      if (!request) break;

      // Check if request has been waiting too long
      const waitTime = Date.now() - request.addedAt;
      if (waitTime > RATE_LIMIT_CONFIG.queueTimeoutMs) {
        requestQueue.shift();
        request.reject(new Error("Request timed out waiting in queue"));
        continue;
      }

      // Check circuit breaker
      const circuitCheck = canMakeRequest();
      if (!circuitCheck.allowed) {
        // Wait and retry
        await sleep(Math.min(circuitCheck.waitMs || 5000, 10000));
        continue;
      }

      // Enforce minimum interval
      const timeSinceLastCall = Date.now() - lastApiCallTime;
      if (timeSinceLastCall < RATE_LIMIT_CONFIG.minIntervalMs) {
        await sleep(RATE_LIMIT_CONFIG.minIntervalMs - timeSinceLastCall);
      }

      // Execute request
      requestQueue.shift();
      try {
        lastApiCallTime = Date.now();
        const result = await request.fn();
        recordSuccess();
        request.resolve(result as never);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const classification = classifyError(err);

        if (classification.isRateLimit) {
          recordFailure();
        }

        request.reject(err);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Execute API call with comprehensive rate limit handling
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Request queuing
 * - Timeout handling
 */
async function executeWithRateLimitHandling<T>(
  fn: () => Promise<T>,
  maxRetries: number = RATE_LIMIT_CONFIG.maxRetries
): Promise<T> {
  // Check circuit breaker first
  const circuitCheck = canMakeRequest();
  if (!circuitCheck.allowed) {
    throw new Error(
      `AI service temporarily unavailable. ${circuitCheck.reason}. Please try again in ${Math.ceil((circuitCheck.waitMs || 0) / 1000)} seconds.`
    );
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Enforce minimum interval between calls
    const timeSinceLastCall = Date.now() - lastApiCallTime;
    if (timeSinceLastCall < RATE_LIMIT_CONFIG.minIntervalMs) {
      await sleep(RATE_LIMIT_CONFIG.minIntervalMs - timeSinceLastCall);
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), RATE_LIMIT_CONFIG.requestTimeoutMs);

      lastApiCallTime = Date.now();

      try {
        const result = await fn();
        clearTimeout(timeoutId);
        recordSuccess();
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const classification = classifyError(lastError);

      // Log attempt details
      console.warn(`[xAI API] Attempt ${attempt + 1}/${maxRetries} failed:`, {
        error: lastError.message,
        isRateLimit: classification.isRateLimit,
        isTransient: classification.isTransient,
        shouldRetry: classification.shouldRetry,
      });

      // Update circuit breaker on rate limit
      if (classification.isRateLimit) {
        recordFailure();
      }

      // Check if we should retry
      if (!classification.shouldRetry) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries - 1) {
        break;
      }

      // Calculate delay with backoff
      const delayMs = calculateBackoffDelay(attempt, classification.retryAfter);
      console.warn(
        `[xAI API] Waiting ${(delayMs / 1000).toFixed(1)}s before retry ${attempt + 2}/${maxRetries}...`
      );

      await sleep(delayMs);
    }
  }

  // All retries exhausted
  const finalError = new Error(
    `AI service request failed after ${maxRetries} attempts. ${lastError?.message || "Unknown error"}. Please try again later.`
  );
  throw finalError;
}

/**
 * Queue a request for rate-limited execution
 * Use this for non-critical requests that can wait
 */
function _queueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
      addedAt: Date.now(),
    });
    processQueue();
  });
}

/**
 * Get current rate limiter status (for debugging/monitoring)
 */
export function getRateLimiterStatus(): {
  circuitState: CircuitState;
  failures: number;
  queueLength: number;
  lastCallTime: number;
} {
  return {
    circuitState: circuitBreaker.state,
    failures: circuitBreaker.failures,
    queueLength: requestQueue.length,
    lastCallTime: lastApiCallTime,
  };
}

/**
 * Reset circuit breaker (for admin use)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker = {
    state: "CLOSED",
    failures: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };
  console.warn("[xAI Circuit Breaker] Manually reset to CLOSED state");
}

/**
 * Get AI insights using Grok
 * Server-side only - uses API key
 */
export async function getGrokInsights(userQuery: string, includeMetrics = true): Promise<string> {
  // Check cache
  const cacheKey = `${userQuery}-${includeMetrics}`;
  const cached = insightCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Build context
  let contextData = "";

  if (includeMetrics) {
    const [metrics, churnData, emailData] = await Promise.all([
      getPlatformMetrics(),
      getChurnData(),
      getEmailCampaignData(),
    ]);

    contextData = `
Current FoodShare Platform Metrics:

USER METRICS:
- Total Users: ${metrics.totalUsers}
- Active Users (7 days): ${metrics.activeUsers7d}
- Active Users (30 days): ${metrics.activeUsers30d}
- Users at Churn Risk: ${churnData.atRiskUsers} (${churnData.churnRate.toFixed(2)}%)

LISTING METRICS:
- Total Listings: ${metrics.totalListings}
- Active Listings: ${metrics.activeListings}
- New Listings (7 days): ${metrics.newListings7d}
- New Listings (30 days): ${metrics.newListings30d}
- Average Views per Listing: ${metrics.averageViews.toFixed(2)}
- Listings by Category: ${JSON.stringify(metrics.listingsByCategory, null, 2)}

ENGAGEMENT METRICS:
- Total Messages: ${metrics.totalMessages}

EMAIL CAMPAIGN METRICS:
${
  emailData
    ? `
- Total Emails Sent: ${emailData.totalEmails}
- Success Rate: ${emailData.successRate.toFixed(2)}%
- Best Send Time: ${emailData.bestSendTime}
- Provider Stats: ${JSON.stringify(emailData.providerStats, null, 2)}
`
    : "Email data not available"
}
`;
  }

  const apiKey = await getAiApiKey();
  if (!apiKey) {
    return "AI insights unavailable - API key not configured in vault or environment variables.";
  }

  const model = selectModel(userQuery);

  // Use Vercel AI SDK with xAI provider
  // AI Gateway keys (vck_) use Vercel's AI Gateway proxy
  const isGatewayKey = apiKey.startsWith("vck_");
  const xai = createXai({
    apiKey,
    // Vercel AI Gateway endpoint for xAI/Grok
    baseURL: isGatewayKey ? "https://ai-gateway.vercel.sh/xai/v1" : undefined,
  });

  // Execute with rate limit handling and exponential backoff
  const result = await executeWithRateLimitHandling(
    () =>
      generateText({
        model: xai(model),
        system: `You are an AI business analyst for FoodShare, a food sharing platform.
Analyze the provided metrics and answer admin questions with actionable insights.
Be concise, data-driven, and provide specific recommendations.
${contextData}`,
        prompt: userQuery,
        temperature: 0.7,
        maxRetries: 0, // We handle retries ourselves with better backoff
      }),
    4 // Max 4 attempts
  );

  const insight = result.text || "No insight generated";

  // Cache result
  insightCache.set(cacheKey, { data: insight, timestamp: Date.now() });

  // Track usage
  const supabase = await createClient();
  await supabase
    .from("grok_usage_logs")
    .insert({
      model,
      tokens: result.usage?.totalTokens || 0,
      timestamp: new Date().toISOString(),
    })
    .then(() => {});

  return insight;
}

/**
 * Get suggested questions based on metrics
 */
export async function getSuggestedQuestions(): Promise<string[]> {
  const [metrics, churnData] = await Promise.all([getPlatformMetrics(), getChurnData()]);

  const suggestions = [
    "Which users are most likely to churn?",
    "What's causing the spike in listings today?",
    "Optimize my email campaign timing",
    "What are the most popular food categories?",
    "How can I improve user engagement?",
  ];

  if (churnData.churnRate > 20) {
    suggestions.unshift("Why is my churn rate so high?");
  }

  if (metrics.newListings7d > metrics.newListings30d / 4) {
    suggestions.unshift("Analyze the recent spike in new listings");
  }

  if (metrics.activeUsers7d < metrics.totalUsers * 0.1) {
    suggestions.unshift("How can I re-engage inactive users?");
  }

  return suggestions.slice(0, 6);
}

/**
 * Clear insight cache
 */
export function clearInsightCache(): void {
  insightCache.clear();
}
