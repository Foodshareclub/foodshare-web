/**
 * Deep Analysis Mode - SQL Query Execution
 * AI generates and executes SQL queries for detailed analysis
 */

import { createXai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { getAiApiKey } from "./api-key";
import { executeWithRateLimitHandling } from "./rate-limiter";
import { MODELS, DATABASE_SCHEMA, ALLOWED_SQL_PATTERNS, FORBIDDEN_SQL_PATTERNS } from "./config";
import { createClient } from "@/lib/supabase/server";

/**
 * Validate SQL query for safety
 */
function validateSqlQuery(sql: string): { valid: boolean; error?: string } {
  const trimmedSql = sql.trim();

  // Check for forbidden patterns
  for (const pattern of FORBIDDEN_SQL_PATTERNS) {
    if (pattern.test(trimmedSql)) {
      return { valid: false, error: "Query contains forbidden operations" };
    }
  }

  // Check for allowed patterns
  const isAllowed = ALLOWED_SQL_PATTERNS.some((pattern) => pattern.test(trimmedSql));
  if (!isAllowed) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Limit query length
  if (trimmedSql.length > 2000) {
    return { valid: false, error: "Query too long (max 2000 characters)" };
  }

  return { valid: true };
}

/**
 * Execute a validated SQL query
 */
async function executeSqlQuery(
  sql: string
): Promise<{ data: unknown[] | null; error: string | null; rowCount: number }> {
  const validation = validateSqlQuery(sql);
  if (!validation.valid) {
    return { data: null, error: validation.error || "Invalid query", rowCount: 0 };
  }

  try {
    const supabase = await createClient();

    // Add LIMIT if not present to prevent huge result sets
    let safeSql = sql.trim();
    if (!/\bLIMIT\s+\d+/i.test(safeSql)) {
      safeSql = safeSql.replace(/;?\s*$/, " LIMIT 100");
    }

    const { data, error } = await supabase.rpc("execute_readonly_query", {
      query_text: safeSql,
    });

    if (error) {
      // Try direct query as fallback (for simpler queries)
      console.warn("RPC failed, query may need execute_readonly_query function:", error.message);
      return { data: null, error: `Query error: ${error.message}`, rowCount: 0 };
    }

    const rows = Array.isArray(data) ? data : [];
    return { data: rows, error: null, rowCount: rows.length };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Query execution failed",
      rowCount: 0,
    };
  }
}

/**
 * Deep analysis mode - AI generates and executes SQL queries
 */
export async function getDeepAnalysis(userQuery: string): Promise<string> {
  const apiKey = await getAiApiKey();
  if (!apiKey) {
    return "AI insights unavailable - API key not configured.";
  }

  const isGatewayKey = apiKey.startsWith("vck_");
  const xai = createXai({
    apiKey,
    baseURL: isGatewayKey ? "https://ai-gateway.vercel.sh/xai/v1" : undefined,
  });

  // Step 1: Generate SQL query
  const sqlGenerationResult = await executeWithRateLimitHandling(
    () =>
      generateText({
        model: xai(MODELS.DEEP_ANALYSIS),
        system: `You are a PostgreSQL expert for FoodShare, a food sharing platform.
Generate a single SELECT query to answer the user's question.

${DATABASE_SCHEMA}

RULES:
- Output ONLY the SQL query, no explanation
- Use only SELECT statements
- Always include LIMIT (max 100 rows)
- Use appropriate JOINs when needed
- For dates, use: NOW(), INTERVAL '7 days', etc.
- For geography, use: ST_Distance, ST_DWithin
- Aggregate with COUNT, SUM, AVG, etc. when appropriate
- Use CTEs (WITH) for complex queries`,
        prompt: userQuery,
        temperature: 0.3,
        maxRetries: 0,
      }),
    3
  );

  const generatedSql = sqlGenerationResult.text?.trim() || "";

  // Clean up SQL (remove markdown code blocks if present)
  const cleanSql = generatedSql
    .replace(/^```sql?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  if (!cleanSql) {
    return "I couldn't generate a query for that question. Please try rephrasing.";
  }

  // Step 2: Execute the query
  const queryResult = await executeSqlQuery(cleanSql);

  if (queryResult.error) {
    // If query failed, return error with the attempted query
    return `**Query attempted:**\n\`\`\`sql\n${cleanSql}\n\`\`\`\n\n**Error:** ${queryResult.error}\n\nPlease try rephrasing your question.`;
  }

  // Step 3: Analyze results with AI
  const dataPreview =
    queryResult.rowCount > 0
      ? JSON.stringify(queryResult.data?.slice(0, 20), null, 2)
      : "No results found";

  const analysisResult = await executeWithRateLimitHandling(
    () =>
      generateText({
        model: xai(MODELS.DEEP_ANALYSIS),
        system: `You are a data analyst for FoodShare. Analyze the query results and provide insights.
Be concise, highlight key findings, and suggest actionable recommendations.
Format numbers nicely (e.g., 1,234 not 1234).
If the data shows trends or anomalies, point them out.`,
        prompt: `User question: ${userQuery}

SQL executed:
${cleanSql}

Results (${queryResult.rowCount} rows):
${dataPreview}

Provide a clear analysis of these results.`,
        temperature: 0.7,
        maxRetries: 0,
      }),
    3
  );

  const analysis = analysisResult.text || "Analysis complete.";

  // Format response
  return `${analysis}

---
<details>
<summary>📊 Query Details</summary>

**SQL:**
\`\`\`sql
${cleanSql}
\`\`\`

**Rows returned:** ${queryResult.rowCount}
</details>`;
}

/**
 * Check if a query should use deep analysis mode
 */
export function shouldUseDeepAnalysis(query: string): boolean {
  const deepAnalysisKeywords = [
    "query",
    "sql",
    "database",
    "find all",
    "list all",
    "show me all",
    "how many",
    "count",
    "top 10",
    "top users",
    "most active",
    "least active",
    "specific user",
    "user with",
    "posts from",
    "between dates",
    "last month",
    "this week",
    "compare",
    "breakdown",
    "by category",
    "by type",
    "group by",
    "detailed report",
    "export",
    "raw data",
    "deep analysis",
    "deep dive",
    "investigate",
  ];

  const lowerQuery = query.toLowerCase();
  return deepAnalysisKeywords.some((keyword) => lowerQuery.includes(keyword));
}
