/**
 * Vector Search Route Handlers
 *
 * GET (query-param) and POST (body) search with shared enhance → embed →
 * `match_posts` RPC pipeline.
 * `match_posts` is executed with the service-role client.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { AppError, ValidationError } from "../../_shared/errors.ts";
import { logger } from "../../_shared/logger.ts";
import { getSupabaseClient } from "../../_shared/supabase.ts";
import { SERVICE, TARGET_DIMENSIONS, VERSION } from "./config.ts";
import { getGroqKey, getHfKey, getZaiKey, isSupabaseAiAvailable } from "./edge-ai.ts";
import { generateVectorEmbedding } from "./providers.ts";
import { enhanceQueryWithGroq } from "./query-expansion.ts";

type SupabaseRpcClient = HandlerContext["supabase"];

export async function handleGet(
  ctx: HandlerContext,
  client?: SupabaseRpcClient,
): Promise<Response> {
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
  const supabase = client ?? getSupabaseClient();
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

export async function handlePost(
  ctx: HandlerContext,
  client?: SupabaseRpcClient,
): Promise<Response> {
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

  const supabase = client ?? getSupabaseClient();
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
