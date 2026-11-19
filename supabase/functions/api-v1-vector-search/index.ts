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

import { createAPIHandler } from "../_shared/api-handler.ts";
import { SERVICE, VERSION } from "./lib/config.ts";
import { handleGet, handlePost } from "./lib/handlers.ts";

// Re-exported for tests (`__tests__/api-v1-vector-search.test.ts`).
export { handleGet, handlePost } from "./lib/handlers.ts";
export { normalizeDimensions } from "./lib/dimensions.ts";

Deno.serve(
  createAPIHandler({
    service: SERVICE,
    version: VERSION,
    requireAuth: false,
    csrf: false,
    rateLimit: {
      limit: 120,
      windowMs: 60000,
      keyBy: "ip",
    },
    routes: {
      GET: { handler: handleGet },
      POST: { handler: handlePost },
    },
  }),
);
