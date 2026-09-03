/**
 * Zero-Latency Edge AI Vector Search API v1
 *
 * Production-ready vector search with graceful multi-provider degradation:
 * 1. Supabase.ai (Local ONNX `gte-small`, free, 0ms network latency)
 * 2. z.ai (Zep / z.ai embeddings via ZAI_API_KEY)
 * 3. Hugging Face (Free Inference Router `BAAI/bge-small-en-v1.5`, 384d)
 * 4. Groq (Ultra-fast LLM query understanding / intent expansion)
 *
 * @module api-v1-vector-search
 * @version 1.1.0
 */

import { createAPIHandler, type HandlerContext, ok } from "../_shared/api-handler.ts";
import { AppError, ValidationError } from "../_shared/errors.ts";
import { logger } from "../_shared/logger.ts";
import { getSecretSync } from "../_shared/vault.ts";

const SERVICE = "api-v1-vector-search";
const VERSION = "1.1.0";
const TARGET_DIMENSIONS = 384;

// =============================================================================
// Edge AI Types & Interfaces
// =============================================================================

interface SupabaseAiSession {
  run(
    text: string,
    options?: { mean_pool?: boolean; normalize?: boolean },
  ): Promise<ArrayLike<number>>;
}

interface SupabaseGlobal {
  Supabase?: {
    ai?: {
      Session: new (model: string) => SupabaseAiSession;
    };
  };
}

// =============================================================================
// Provider Secrets & Detection
// =============================================================================

function getZaiKey(): string {
  return getSecretSync("ZAI_API_KEY") || Deno.env.get("ZAI_API_KEY") || "";
}

function getGroqKey(): string {
  return getSecretSync("GROQ_API_KEY") || Deno.env.get("GROQ_API_KEY") || "";
}

function getHfKey(): string {
  return (
    getSecretSync("HUGGINGFACE_ACCESS_TOKEN") ||
    Deno.env.get("HUGGINGFACE_ACCESS_TOKEN") ||
    ""
  );
}

function isSupabaseAiAvailable(): boolean {
  try {
    const globalSupabase = globalThis as unknown as SupabaseGlobal;
    return typeof globalSupabase.Supabase?.ai?.Session !== "undefined";
  } catch {
    return false;
  }
}

// Lazy session instance for local edge runtime
let edgeAiSession: SupabaseAiSession | null = null;
function getEdgeAiSession(): SupabaseAiSession | null {
  if (!edgeAiSession && isSupabaseAiAvailable()) {
    try {
      const globalSupabase = globalThis as unknown as SupabaseGlobal;
      if (globalSupabase.Supabase?.ai?.Session) {
        edgeAiSession = new globalSupabase.Supabase.ai.Session("gte-small");
      }
    } catch (err) {
      logger.warn("Failed to initialize Supabase.ai edge session", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return edgeAiSession;
}

// =============================================================================
// Dimension Normalization
// =============================================================================

export function normalizeDimensions(
  embedding: number[],
  targetDim: number = TARGET_DIMENSIONS,
): number[] {
  if (embedding.length === targetDim) {
    return embedding;
  }
  if (embedding.length > targetDim) {
    // Truncate to target dimensions
    return embedding.slice(0, targetDim);
  }
  // Pad with zeros if shorter
  const padded = [...embedding];
  while (padded.length < targetDim) {
    padded.push(0);
  }
  return padded;
}

// =============================================================================
// Groq Query Expansion (Optional enhancement)
// =============================================================================

interface EnhancedQuery {
  expandedQuery: string;
  detectedCategories?: string[];
  dietaryFilters?: string[];
}

async function enhanceQueryWithGroq(queryText: string): Promise<EnhancedQuery> {
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

// =============================================================================
// Embedding Generation Providers
// =============================================================================

interface EmbeddingOutput {
  embedding: number[];
  provider: "supabase_ai" | "z_ai" | "huggingface";
  model: string;
}

async function generateVectorEmbedding(
  text: string,
  preferredProvider?: string,
): Promise<EmbeddingOutput> {
  const errors: string[] = [];

  // 1. Try Supabase.ai (Local ONNX, 0ms network hop, 100% Free)
  if (
    !preferredProvider ||
    preferredProvider === "supabase_ai" ||
    preferredProvider === "auto"
  ) {
    const session = getEdgeAiSession();
    if (session) {
      try {
        const output = await session.run(text, {
          mean_pool: true,
          normalize: true,
        });
        const rawEmbedding = Array.from(output);
        return {
          embedding: normalizeDimensions(rawEmbedding, TARGET_DIMENSIONS),
          provider: "supabase_ai",
          model: "gte-small (edge-onnx)",
        };
      } catch (err) {
        errors.push(
          `supabase_ai: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // 2. Try z.ai / Zep (Free tier / ZAI_API_KEY)
  if (
    !preferredProvider ||
    preferredProvider === "z_ai" ||
    preferredProvider === "zep" ||
    preferredProvider === "auto"
  ) {
    const zaiKey = getZaiKey();
    if (zaiKey) {
      try {
        const res = await fetch("https://api.z.ai/api/v2/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${zaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: [text],
            model: "text-embedding-3-small",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawEmbedding: number[] = data.embeddings?.[0] || data.data?.[0]?.embedding || [];
          if (rawEmbedding.length > 0) {
            return {
              embedding: normalizeDimensions(rawEmbedding, TARGET_DIMENSIONS),
              provider: "z_ai",
              model: data.model || "text-embedding-3-small",
            };
          }
        } else {
          errors.push(`z_ai HTTP ${res.status}`);
        }
      } catch (err) {
        errors.push(
          `z_ai: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // 3. Try Hugging Face Free Inference API (BAAI/bge-small-en-v1.5, 384 dimensions)
  if (
    !preferredProvider ||
    preferredProvider === "huggingface" ||
    preferredProvider === "auto"
  ) {
    const hfKey = getHfKey();
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (hfKey) headers.Authorization = `Bearer ${hfKey}`;

      const res = await fetch(
        "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ inputs: text }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const rawEmbedding: number[] = Array.isArray(data[0]) ? data[0] : data;
        if (rawEmbedding.length > 0) {
          return {
            embedding: normalizeDimensions(rawEmbedding, TARGET_DIMENSIONS),
            provider: "huggingface",
            model: "BAAI/bge-small-en-v1.5",
          };
        }
      } else {
        errors.push(`huggingface HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(
        `huggingface: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  throw new AppError(
    `All embedding providers failed: ${errors.join("; ")}`,
    "EMBEDDING_FAILED",
    500,
  );
}

// =============================================================================
// Route Handlers
// =============================================================================

export async function handleGet(ctx: HandlerContext): Promise<Response> {
  const url = new URL(ctx.request.url);

  // Health check sub-route
  if (
    url.searchParams.get("route") === "health" ||
    url.pathname.endsWith("/health")
  ) {
    return ok(
      {
        service: SERVICE,
        version: VERSION,
        status: "healthy",
        providers: {
          supabase_ai: isSupabaseAiAvailable() ? "ready" : "unavailable",
          z_ai: getZaiKey() ? "configured" : "missing",
          groq: getGroqKey() ? "configured" : "missing",
          huggingface: getHfKey() ? "configured" : "public_fallback",
        },
        targetDimensions: TARGET_DIMENSIONS,
      },
      ctx,
    );
  }

  const queryText = url.searchParams.get("q");
  if (!queryText || queryText.trim().length === 0) {
    throw new ValidationError(
      "Query parameter 'q' is required for vector search",
    );
  }

  const threshold = Number.parseFloat(
    url.searchParams.get("threshold") || "0.65",
  );
  const limit = Math.min(
    Math.max(1, Number.parseInt(url.searchParams.get("limit") || "10", 10)),
    50,
  );
  const enhance = url.searchParams.get("enhance") === "true" ||
    url.searchParams.get("groq") === "true";
  const preferredProvider = url.searchParams.get("provider") || "auto";

  const startTime = performance.now();

  // 1. Optional Groq query enhancement
  let searchPrompt = queryText.trim();
  let enhanced = false;
  if (enhance && getGroqKey()) {
    const groqResult = await enhanceQueryWithGroq(searchPrompt);
    if (groqResult.expandedQuery !== searchPrompt) {
      searchPrompt = groqResult.expandedQuery;
      enhanced = true;
    }
  }

  // 2. Generate embedding (Supabase.ai / z.ai / HF fallback)
  const embeddingData = await generateVectorEmbedding(
    searchPrompt,
    preferredProvider,
  );

  // 3. Match posts via PostgreSQL RPC
  const { supabase } = ctx;
  const { data: posts, error } = await supabase.rpc("match_posts", {
    query_embedding: embeddingData.embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    logger.error("match_posts RPC failed", new Error(error.message), {
      code: error.code,
      details: error.details,
    });
    throw new AppError(
      `Vector similarity query failed: ${error.message}`,
      "DB_ERROR",
      500,
    );
  }

  const tookMs = Math.round(performance.now() - startTime);

  return ok(
    {
      results: posts || [],
      total: posts?.length || 0,
      provider: embeddingData.provider,
      model: embeddingData.model,
      enhanced,
      took_ms: tookMs,
    },
    ctx,
  );
}

export async function handlePost(ctx: HandlerContext): Promise<Response> {
  const body = (ctx.body || {}) as Record<string, unknown>;
  const queryText = (body.query as string) || (body.q as string);

  if (
    !queryText ||
    typeof queryText !== "string" ||
    queryText.trim().length === 0
  ) {
    throw new ValidationError("Body field 'query' is required");
  }

  const threshold = typeof body.threshold === "number" ? body.threshold : 0.65;
  const limit = Math.min(
    Math.max(1, typeof body.limit === "number" ? body.limit : 10),
    50,
  );
  const enhance = body.enhance === true || body.groq === true;
  const preferredProvider = (body.provider as string) || "auto";

  const startTime = performance.now();

  let searchPrompt = queryText.trim();
  let enhanced = false;
  if (enhance && getGroqKey()) {
    const groqResult = await enhanceQueryWithGroq(searchPrompt);
    if (groqResult.expandedQuery !== searchPrompt) {
      searchPrompt = groqResult.expandedQuery;
      enhanced = true;
    }
  }

  const embeddingData = await generateVectorEmbedding(
    searchPrompt,
    preferredProvider,
  );

  const { supabase } = ctx;
  const { data: posts, error } = await supabase.rpc("match_posts", {
    query_embedding: embeddingData.embedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    logger.error("match_posts RPC failed", new Error(error.message), {
      code: error.code,
      details: error.details,
    });
    throw new AppError(
      `Vector similarity query failed: ${error.message}`,
      "DB_ERROR",
      500,
    );
  }

  const tookMs = Math.round(performance.now() - startTime);

  return ok(
    {
      results: posts || [],
      total: posts?.length || 0,
      provider: embeddingData.provider,
      model: embeddingData.model,
      enhanced,
      took_ms: tookMs,
    },
    ctx,
  );
}

// =============================================================================
// Export Handler
// =============================================================================

Deno.serve(
  createAPIHandler({
    service: SERVICE,
    version: VERSION,
    requireAuth: false,
    csrf: false,
    rateLimit: {
      limit: 120,
      windowMs: 60_000,
      keyBy: "ip",
    },
    routes: {
      GET: { handler: handleGet },
      POST: { handler: handlePost },
    },
  }),
);
