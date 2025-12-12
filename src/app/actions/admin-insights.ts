"use server";

/**
 * Admin AI Insights Server Actions
 */

import { requireAdmin } from "@/lib/data/admin-auth";
import {
  getGrokInsights as getInsights,
  getSuggestedQuestions as getSuggestions,
  clearInsightCache,
  getRateLimiterStatus,
  resetCircuitBreaker,
  getDeepAnalysis,
  shouldUseDeepAnalysis,
} from "@/lib/data/admin-insights";

interface InsightResult {
  success: boolean;
  insight?: string;
  error?: string;
  errorType?: "rate_limit" | "circuit_open" | "timeout" | "api_error" | "unknown";
  retryAfterSeconds?: number;
}

/**
 * Classify error for better user feedback
 */
function classifyErrorForUser(error: Error): {
  errorType: InsightResult["errorType"];
  message: string;
  retryAfterSeconds?: number;
} {
  const msg = error.message.toLowerCase();

  if (msg.includes("circuit") || msg.includes("temporarily unavailable")) {
    // Extract wait time if present
    const waitMatch = msg.match(/(\d+)\s*seconds/);
    return {
      errorType: "circuit_open",
      message:
        "The AI service is temporarily paused due to high demand. Please wait a moment and try again.",
      retryAfterSeconds: waitMatch ? parseInt(waitMatch[1], 10) : 30,
    };
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("429") ||
    msg.includes("quota")
  ) {
    return {
      errorType: "rate_limit",
      message:
        "The AI service is experiencing high traffic. Please wait a few seconds and try again.",
      retryAfterSeconds: 10,
    };
  }

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      errorType: "timeout",
      message: "The request took too long. Please try a simpler question or try again.",
      retryAfterSeconds: 5,
    };
  }

  if (msg.includes("api key") || msg.includes("unauthorized") || msg.includes("invalid")) {
    return {
      errorType: "api_error",
      message: "AI service configuration error. Please contact support.",
    };
  }

  return {
    errorType: "unknown",
    message: error.message || "An unexpected error occurred. Please try again.",
    retryAfterSeconds: 5,
  };
}

/**
 * Get AI insights for admin query
 * @param query - User's question
 * @param includeMetrics - Include platform metrics in context
 * @param enableDeepAnalysis - Allow SQL query generation (auto-detected if not specified)
 */
export async function getGrokInsight(
  query: string,
  includeMetrics = true,
  enableDeepAnalysis?: boolean
): Promise<InsightResult> {
  try {
    await requireAdmin();

    // Auto-detect if deep analysis should be used
    const useDeepAnalysis = enableDeepAnalysis ?? shouldUseDeepAnalysis(query);

    let insight: string;
    if (useDeepAnalysis) {
      insight = await getDeepAnalysis(query);
    } else {
      insight = await getInsights(query, includeMetrics);
    }

    return { success: true, insight };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const classified = classifyErrorForUser(error);

    return {
      success: false,
      error: classified.message,
      errorType: classified.errorType,
      retryAfterSeconds: classified.retryAfterSeconds,
    };
  }
}

/**
 * Get suggested questions
 */
export async function getInsightSuggestions(): Promise<string[]> {
  try {
    await requireAdmin();
    return await getSuggestions();
  } catch {
    return [
      "How can I improve user engagement?",
      "What are the most popular food categories?",
      "Analyze recent listing trends",
    ];
  }
}

/**
 * Clear the insight cache
 */
export async function clearInsights(): Promise<{ success: boolean }> {
  try {
    await requireAdmin();
    clearInsightCache();
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Get AI service status (for admin monitoring)
 */
export async function getAiServiceStatus(): Promise<{
  circuitState: string;
  failures: number;
  queueLength: number;
  isHealthy: boolean;
}> {
  try {
    await requireAdmin();
    const status = getRateLimiterStatus();
    return {
      circuitState: status.circuitState,
      failures: status.failures,
      queueLength: status.queueLength,
      isHealthy: status.circuitState === "CLOSED" && status.failures === 0,
    };
  } catch {
    return {
      circuitState: "UNKNOWN",
      failures: 0,
      queueLength: 0,
      isHealthy: false,
    };
  }
}

/**
 * Reset AI service circuit breaker (admin emergency action)
 */
export async function resetAiService(): Promise<{ success: boolean; message: string }> {
  try {
    await requireAdmin();
    resetCircuitBreaker();
    clearInsightCache();
    return {
      success: true,
      message: "AI service has been reset. You can now try your request again.",
    };
  } catch {
    return {
      success: false,
      message: "Failed to reset AI service.",
    };
  }
}
