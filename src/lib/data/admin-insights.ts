/**
 * Admin AI Insights Data Layer
 * Server-side only - contains API keys
 */

import { createClient } from "@/lib/supabase/server";

// Grok model configuration
const MODELS = {
  QUICK_INSIGHTS: "grok-3-mini",
  FAST_REASONING: "grok-4-fast-non-reasoning",
  DEEP_ANALYSIS: "grok-4-fast-reasoning",
} as const;

// Cache for insights
const insightCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

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

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return "AI insights unavailable - API key not configured";
  }

  const model = selectModel(userQuery);

  // Dynamic import to avoid client-side bundling
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",
  });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are an AI business analyst for FoodShare, a food sharing platform.
Analyze the provided metrics and answer admin questions with actionable insights.
Be concise, data-driven, and provide specific recommendations.
${contextData}`,
      },
      {
        role: "user",
        content: userQuery,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const insight = completion.choices[0]?.message?.content || "No insight generated";

  // Cache result
  insightCache.set(cacheKey, { data: insight, timestamp: Date.now() });

  // Track usage
  const supabase = await createClient();
  await supabase
    .from("grok_usage_logs")
    .insert({
      model,
      tokens: completion.usage?.total_tokens || 0,
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
