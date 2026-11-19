/**
 * Groq Query Expansion (optional enhancement)
 *
 * Food-domain query optimization with graceful fallback to the raw query.
 * Extracted from `api-v1-vector-search/index.ts` — no logic changes.
 */

import { logger } from "../../_shared/logger.ts";
import { getGroqKey } from "./edge-ai.ts";

export interface EnhancedQuery {
  expandedQuery: string;
  detectedCategories?: string[];
  dietaryFilters?: string[];
}

export async function enhanceQueryWithGroq(queryText: string): Promise<EnhancedQuery> {
  const groqKey = getGroqKey();
  if (!groqKey) {
    return { expandedQuery: queryText };
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a food search query optimizer. Given a user search term, output a concise expanded semantic search string (focusing on food ingredients, dishes, and categories) to maximize vector cosine similarity matching. Respond ONLY with the optimized search keywords string.",
          },
          {
            role: "user",
            content: queryText,
          },
        ],
        temperature: 0.2,
        max_tokens: 60,
      }),
    });

    if (!res.ok) {
      return { expandedQuery: queryText };
    }

    const data = await res.json();
    const expanded = data.choices?.[0]?.message?.content?.trim();
    return {
      expandedQuery: expanded ? `${queryText} ${expanded}` : queryText,
    };
  } catch (err) {
    logger.warn(
      "Groq query enhancement failed, falling back to original query",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
    return { expandedQuery: queryText };
  }
}
