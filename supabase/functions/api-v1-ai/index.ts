/**
 * Unified AI API v1
 *
 * Consolidates ai-api (Groq/z.ai) + hf-inference (Hugging Face) into a single endpoint.
 *
 * Routes:
 * - POST /chat              - LLM chat completion (Groq)
 * - POST /embeddings        - Text embeddings (z.ai)
 * - POST /inference/:task   - HF inference (translation, textToSpeech, textToImage, etc.)
 * - GET  /models            - List available models
 * - GET  /health            - Provider health check
 *
 * @module api-v1-ai
 */

// HfInference loaded lazily only when inference routes are hit (saves ~100-200ms cold start)
import { createAPIHandler } from "../_shared/api-handler.ts";
import { createHealthHandler } from "../_shared/health-handler.ts";
import { getGroqKey, getHfKey, getZaiKey, VERSION } from "./lib/config.ts";
import { createRouteHandlers } from "./lib/handlers.ts";
import { postBodySchema } from "./lib/schemas.ts";

const healthCheck = createHealthHandler("api-v1-ai", VERSION, {
  extra: () => ({
    providers: {
      groq: getGroqKey() ? "configured" : "missing",
      zai: getZaiKey() ? "configured" : "missing",
      huggingface: getHfKey() ? "configured" : "missing",
    },
  }),
});
const { handleGet, handlePost } = createRouteHandlers(healthCheck);

Deno.serve(createAPIHandler({
  service: "api-v1-ai",
  version: VERSION,
  requireAuth: false, // Auth handled per-route: chat/embeddings require JWT, inference/health/models public
  csrf: false, // API clients
  rateLimit: {
    limit: 30,
    windowMs: 60000,
    keyBy: "ip",
  },
  routes: {
    GET: {
      handler: handleGet,
    },
    POST: {
      schema: postBodySchema,
      handler: handlePost,
    },
  },
}));
