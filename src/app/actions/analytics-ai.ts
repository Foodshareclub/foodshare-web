"use server";

/**
 * AI-Powered Analytics Actions
 *
 * Uses MotherDuck's AI capabilities for natural language queries
 * and LLM-powered insights generation.
 */

import { createClient } from "@/lib/supabase/server";
import { serverActionError, serverActionSuccess } from "@/lib/errors";
import type { ServerActionResult } from "@/lib/errors";
import { getMotherDuckToken } from "@/lib/email/vault";

// MotherDuck REST API endpoint
const MOTHERDUCK_API = "https://api.motherduck.com/v1/sql";

interface MotherDuckResponse {
  data?: Record<string, unknown>[];
  error?: string;
  meta?: {
    rows_affected?: number;
    execution_time_ms?: number;
  };
}

/**
 * Execute SQL query against MotherDuck via REST API
 * More reliable than duckdb-async in serverless environments
 */
async function executeMotherDuckSQL(sql: string): Promise<MotherDuckResponse> {
  const token = await getMotherDuckToken();

  if (!token) {
    throw new Error("MotherDuck token not configured");
  }

  const response = await fetch(MOTHERDUCK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MotherDuck API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Natural Language Query
 *
 * Converts natural language questions into SQL and executes them.
 * Uses MotherDuck's prompt() function for text-to-SQL.
 */
export interface NLQueryResult {
  question: string;
  generatedSQL: string;
  answer: string;
  data: Record<string, unknown>[];
  executionTimeMs: number;
}

export async function askAnalyticsQuestion(
  question: string
): Promise<ServerActionResult<NLQueryResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // Sanitize question to prevent injection
    const sanitizedQuestion = question.replace(/'/g, "''").slice(0, 500);

    const startTime = Date.now();

    // Step 1: Generate SQL from natural language using prompt()
    const sqlGenQuery = `
      SELECT prompt(
        'You are a SQL expert. Generate a DuckDB SQL query to answer this question about a food sharing platform.
        Available tables:
        - full_users (id, created_at, nickname, is_active, is_verified, last_seen_at)
        - full_listings (id, created_at, post_name, post_type, is_active, is_arranged, profile_id, post_views, post_like_counter)
        - events (id, event_name, user_id, properties, timestamp)

        Question: ${sanitizedQuestion}

        Return ONLY the SQL query, no explanation. Use DuckDB syntax.',
        struct := {sql: 'VARCHAR'}
      ) as result
    `;

    const sqlGenResult = await executeMotherDuckSQL(sqlGenQuery);
    const generatedSQL = (sqlGenResult.data?.[0]?.result as { sql?: string })?.sql || "";

    if (!generatedSQL) {
      return serverActionError("Could not generate SQL for this question", "VALIDATION_ERROR");
    }

    // Step 2: Execute the generated SQL (with safety checks)
    const safeSql = generatedSQL.trim();

    // Only allow SELECT queries for safety
    if (!safeSql.toUpperCase().startsWith("SELECT")) {
      return serverActionError("Only SELECT queries are allowed", "VALIDATION_ERROR");
    }

    const dataResult = await executeMotherDuckSQL(safeSql);
    const data = dataResult.data || [];

    // Step 3: Generate natural language answer
    const answerQuery = `
      SELECT prompt(
        'Based on this data: ${JSON.stringify(data).slice(0, 2000)}

        Answer this question in 1-2 sentences: ${sanitizedQuestion}',
        struct := {answer: 'VARCHAR'}
      ) as result
    `;

    const answerResult = await executeMotherDuckSQL(answerQuery);
    const answer =
      (answerResult.data?.[0]?.result as { answer?: string })?.answer ||
      "Unable to generate answer";

    const executionTimeMs = Date.now() - startTime;

    return serverActionSuccess({
      question,
      generatedSQL: safeSql,
      answer,
      data,
      executionTimeMs,
    });
  } catch (error) {
    console.error("AI query error:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to process question",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Generate Weekly Community Report
 *
 * Uses LLM to create a narrative summary of platform activity.
 */
export interface WeeklyReport {
  period: string;
  summary: string;
  highlights: string[];
  metrics: {
    newUsers: number;
    newListings: number;
    arrangedItems: number;
    topCategory: string;
  };
  generatedAt: string;
}

export async function generateWeeklyReport(): Promise<ServerActionResult<WeeklyReport>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // Gather metrics for the past week
    const metricsQuery = `
      WITH weekly_stats AS (
        SELECT
          (SELECT count(*) FROM full_users WHERE created_at >= current_date - INTERVAL 7 DAY) as new_users,
          (SELECT count(*) FROM full_listings WHERE created_at >= current_date - INTERVAL 7 DAY) as new_listings,
          (SELECT count(*) FROM full_listings WHERE is_arranged = true AND post_arranged_at >= current_date - INTERVAL 7 DAY) as arranged_items,
          (SELECT post_type FROM full_listings WHERE created_at >= current_date - INTERVAL 7 DAY GROUP BY post_type ORDER BY count(*) DESC LIMIT 1) as top_category
      )
      SELECT * FROM weekly_stats
    `;

    const metricsResult = await executeMotherDuckSQL(metricsQuery);
    const metrics = metricsResult.data?.[0] || {};

    // Generate narrative summary using LLM
    const summaryQuery = `
      SELECT prompt(
        'You are writing a weekly community report for FoodShare, a food sharing platform.

        This week''s metrics:
        - New users: ${metrics.new_users || 0}
        - New listings: ${metrics.new_listings || 0}
        - Items successfully shared: ${metrics.arranged_items || 0}
        - Most popular category: ${metrics.top_category || "food"}

        Write a brief, upbeat 2-3 sentence summary highlighting the community''s impact on reducing food waste.
        Then provide 3 bullet point highlights.',
        struct := {summary: 'VARCHAR', highlight1: 'VARCHAR', highlight2: 'VARCHAR', highlight3: 'VARCHAR'}
      ) as result
    `;

    const summaryResult = await executeMotherDuckSQL(summaryQuery);
    const llmResult = summaryResult.data?.[0]?.result as {
      summary?: string;
      highlight1?: string;
      highlight2?: string;
      highlight3?: string;
    };

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return serverActionSuccess({
      period: `${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}`,
      summary: llmResult?.summary || "Community activity this week.",
      highlights: [
        llmResult?.highlight1 || "Users shared food with neighbors",
        llmResult?.highlight2 || "New members joined the community",
        llmResult?.highlight3 || "Food waste was prevented",
      ].filter(Boolean),
      metrics: {
        newUsers: Number(metrics.new_users) || 0,
        newListings: Number(metrics.new_listings) || 0,
        arrangedItems: Number(metrics.arranged_items) || 0,
        topCategory: String(metrics.top_category || "food"),
      },
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Weekly report error:", error);
    return serverActionError(
      error instanceof Error ? error.message : "Failed to generate report",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Get AI-Powered Insights
 *
 * Analyzes patterns and generates actionable recommendations.
 */
export interface AIInsight {
  type: "trend" | "anomaly" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  metric?: string;
  value?: number;
}

export async function getAIInsights(): Promise<ServerActionResult<AIInsight[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return serverActionError("Unauthorized", "UNAUTHORIZED");
    }

    // Gather data for analysis
    const analysisQuery = `
      WITH daily_activity AS (
        SELECT
          date_trunc('day', created_at) as day,
          count(*) as listings
        FROM full_listings
        WHERE created_at >= current_date - INTERVAL 30 DAY
        GROUP BY 1
        ORDER BY 1
      ),
      category_trends AS (
        SELECT
          post_type,
          count(*) as count,
          count(case when is_arranged then 1 end) as arranged
        FROM full_listings
        WHERE created_at >= current_date - INTERVAL 30 DAY
        GROUP BY 1
      ),
      user_engagement AS (
        SELECT
          count(distinct user_id) as active_users,
          count(*) as total_events
        FROM events
        WHERE timestamp >= current_date - INTERVAL 7 DAY
      )
      SELECT
        (SELECT json_group_array(json_object('day', day, 'listings', listings)) FROM daily_activity) as daily,
        (SELECT json_group_array(json_object('type', post_type, 'count', count, 'arranged', arranged)) FROM category_trends) as categories,
        (SELECT json_object('active_users', active_users, 'total_events', total_events) FROM user_engagement) as engagement
    `;

    const analysisResult = await executeMotherDuckSQL(analysisQuery);
    const analysisData = analysisResult.data?.[0] || {};

    // Generate insights using LLM
    const insightsQuery = `
      SELECT prompt(
        'Analyze this food sharing platform data and provide 3 actionable insights:

        Daily listing activity (last 30 days): ${JSON.stringify(analysisData.daily || []).slice(0, 1000)}
        Category performance: ${JSON.stringify(analysisData.categories || []).slice(0, 500)}
        User engagement (last 7 days): ${JSON.stringify(analysisData.engagement || {})}

        For each insight, provide:
        - type: "trend", "anomaly", or "recommendation"
        - title: short title (max 50 chars)
        - description: actionable insight (max 150 chars)
        - confidence: 0.0 to 1.0

        Return as JSON array.',
        struct := {insights: 'VARCHAR'}
      ) as result
    `;

    const insightsResult = await executeMotherDuckSQL(insightsQuery);
    const llmInsights = insightsResult.data?.[0]?.result as { insights?: string };

    let insights: AIInsight[] = [];
    try {
      insights = JSON.parse(llmInsights?.insights || "[]");
    } catch {
      // Fallback insights if LLM parsing fails
      insights = [
        {
          type: "trend",
          title: "Steady Growth",
          description: "Platform activity remains consistent over the past month.",
          confidence: 0.8,
        },
        {
          type: "recommendation",
          title: "Engage Inactive Users",
          description: "Consider re-engagement campaigns for users who haven't listed in 2+ weeks.",
          confidence: 0.7,
        },
      ];
    }

    return serverActionSuccess(insights);
  } catch (error) {
    console.error("AI insights error:", error);
    return serverActionSuccess([]); // Return empty on error to not break UI
  }
}
