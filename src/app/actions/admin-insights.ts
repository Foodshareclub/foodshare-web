"use server";

/**
 * Admin AI Insights Server Actions
 */

import { requireAdmin } from "@/lib/data/admin-auth";
import {
  getGrokInsights as getInsights,
  getSuggestedQuestions as getSuggestions,
  clearInsightCache,
} from "@/lib/data/admin-insights";

interface InsightResult {
  success: boolean;
  insight?: string;
  error?: string;
}

/**
 * Get AI insights for admin query
 */
export async function getGrokInsight(query: string, includeMetrics = true): Promise<InsightResult> {
  try {
    await requireAdmin();
    const insight = await getInsights(query, includeMetrics);
    return { success: true, insight };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to get insights",
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
