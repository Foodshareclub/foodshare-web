/**
 * AI Insights Generation
 * Provides AI-powered insights using Grok models
 */

import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { getAiApiKey } from "./api-key";
import { getPlatformMetrics, getChurnData, getEmailCampaignData } from "./platform-metrics";
import { executeWithRateLimitHandling } from "./rate-limiter";
import { MODELS, CACHE_TTL } from "./config";
import { createClient } from "@/lib/supabase/server";

// Cache for insights
const insightCache = new Map<string, { data: string; timestamp: number }>();

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
