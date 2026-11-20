/**
 * AI Route Handlers (POST dispatch + GET info/models)
 *
 * Auth is per-route: chat/embeddings/inference require authentication; health/models
 * are public. Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { AuthenticationError, RateLimitError, ServerError, ValidationError } from "../../_shared/errors.ts";
import type { createHealthHandler } from "../../_shared/health-handler.ts";
import { logger } from "../../_shared/logger.ts";
import { getSubPath } from "./path.ts";
import { groqChat } from "./providers/groq.ts";
import { runHfInference } from "./providers/huggingface.ts";
import { imageSearch } from "./providers/image-search.ts";
import { enrichListing, imageVerify } from "./providers/image-pipeline.ts";
import { enqueueEnrich, processEnrichQueue } from "./providers/enrich-queue.ts";
import { zaiEmbeddings } from "./providers/zai.ts";
import type { PostBody } from "./schemas.ts";
import { VERSION } from "./config.ts";
import { requireServiceAuth, verifyServiceAuth } from "../../_shared/service-auth.ts";
import { checkRateLimit } from "../../api-v1-images/lib/storage.ts";

export function createRouteHandlers(
  healthCheck: ReturnType<typeof createHealthHandler>,
) {
  async function handlePost(ctx: HandlerContext<PostBody>): Promise<Response> {
    const url = new URL(ctx.request.url);
    const subPath = getSubPath(url);

    // POST /chat
    if (subPath === "chat" || subPath === "chat/") {
      if (!ctx.userId) throw new ValidationError("Authentication required");

      const body = ctx.body || {};
      const result = await groqChat(
        body.messages || [],
        body.model || "llama-3.3-70b-versatile",
        body.temperature ?? 0.7,
        body.maxTokens,
      );
      return ok(result, ctx);
    }

    // POST /embeddings
    if (subPath === "embeddings" || subPath === "embeddings/") {
      if (!ctx.userId) throw new ValidationError("Authentication required");

      const body = ctx.body || {};
      if (!body.input) throw new ValidationError("input is required");
      const result = await zaiEmbeddings(body.input);
      return ok(result, ctx);
    }

    // POST /inference/:task
    if (subPath.startsWith("inference/")) {
      if (!ctx.userId && !verifyServiceAuth(ctx.request)) throw new AuthenticationError();
      const task = subPath.split("/")[1];
      if (task === "textToImage" && ctx.userId && !await checkRateLimit(ctx.userId, ctx.supabase)) {
        throw new RateLimitError("Cover generation quota exceeded");
      }
      if (!task) throw new ValidationError("Inference task is required");

      // POST /inference/imageSearch — SERP crawl for the real-photo pipeline.
      // Service-auth ONLY (backend pipeline stage; no client UI calls it).
      if (task === "imageSearch") {
        requireServiceAuth(ctx.request);
        // deno-lint-ignore no-explicit-any
        const body = (ctx.body || {}) as Record<string, any>;
        const result = await imageSearch(
          {
            name: typeof body.name === "string" ? body.name : "",
            city: typeof body.city === "string" ? body.city : undefined,
            state: typeof body.state === "string" ? body.state : undefined,
            post_type: body.post_type as "fridge" | "foodbank",
            max_results: typeof body.max_results === "number" ? body.max_results : undefined,
          },
          ctx.supabase,
        );
        return ok(result, ctx);
      }
      if (task === "imageVerify") {
        // deno-lint-ignore no-explicit-any
        const body = (ctx.body || {}) as Record<string, any>;
        const result = await imageVerify(
          {
            image_url: String(body.image_url || body.inputs || ""),
            listing_name: String(body.listing_name || ""),
            listing_address: body.listing_address as string | undefined,
            post_type: (body.post_type as "fridge" | "foodbank") || "fridge",
          },
          ctx.supabase,
        );
        return ok(result, ctx);
      }

      if (task === "enrichListing") {
        // deno-lint-ignore no-explicit-any
        const body = (ctx.body || {}) as Record<string, any>;
        const postId = Number(body.post_id);
        if (!postId) throw new ValidationError("post_id is required");
        // Service-path rate limit: throttle the backfill (not user-gated)
        const serviceKey = `service-enrich-${postId}`;
        if (!await checkRateLimit(serviceKey, ctx.supabase)) {
          throw new ServerError("Rate limit exceeded on enrichListing");
        }
        const result = await enrichListing({ post_id: postId }, ctx.supabase);
        return ok(result, ctx);
      }

      // Create-path hook: enqueue a new fridge/foodbank listing for async
      // real-photo enrichment (non-blocking the create response). Service-auth
      // only (the create path calls it with the service key). Idempotent.
      if (task === "enqueueEnrich") {
        if (!verifyServiceAuth(ctx.request)) throw new AuthenticationError();
        // deno-lint-ignore no-explicit-any
        const body = (ctx.body || {}) as Record<string, any>;
        const postId = Number(body.post_id);
        if (!postId) throw new ValidationError("post_id is required");
        const queued = await enqueueEnrich(ctx.supabase, postId);
        return ok({ queued, post_id: postId }, ctx);
      }

      // Create-path hook worker: claim + process the enrich queue. Service/cron
      // auth. Called by pg_cron (or the backfill) to drain the queue.
      if (task === "enrichListingQueue") {
        if (!verifyServiceAuth(ctx.request)) throw new AuthenticationError();
        // deno-lint-ignore no-explicit-any
        const body = (ctx.body || {}) as Record<string, any>;
        const batchSize = Number(body.batch_size || 10);
        const dryRun = body.dry_run === true;
        const result = await processEnrichQueue(ctx.supabase, batchSize, dryRun);
        return ok(result, ctx);
      }

      logger.info("Processing HF inference", {
        task,
        model: ctx.body?.model,
        requestId: ctx.ctx?.requestId,
      });

      const startTime = performance.now();
      const { result, contentType, cached, cacheSource } = await runHfInference(
        task,
        ctx.body,
        ctx.supabase,
        ctx.ctx?.requestId || "",
      );

      const responseTime = Math.round(performance.now() - startTime);

      if (contentType !== "application/json") {
        return new Response(result as Blob, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "X-Cache": cached ? "HIT" : "MISS",
            "X-Response-Time": `${responseTime}ms`,
          },
        });
      }

      return ok(
        {
          result,
          cached,
          ...(cacheSource ? { cacheSource } : {}),
          responseTime,
        },
        ctx,
      );
    }

    throw new ValidationError(
      "Unknown endpoint. Use /chat, /embeddings, or /inference/:task",
    );
  }

  async function handleGet(ctx: HandlerContext): Promise<Response> {
    const url = new URL(ctx.request.url);
    const subPath = getSubPath(url);

    // GET /health
    if (subPath === "health" || subPath === "health/") {
      return healthCheck(ctx);
    }

    // GET /models
    if (subPath === "models" || subPath === "models/") {
      return ok(
        {
          chat: [
            { id: "llama-3.3-70b-versatile", provider: "groq" },
            { id: "mixtral-8x7b-32768", provider: "groq" },
          ],
          embeddings: [{ id: "text-embedding-3-small", provider: "z.ai" }],
          inference: [
            {
              task: "translation",
              defaultModel: "t5-base",
              provider: "huggingface",
            },
            {
              task: "textToSpeech",
              defaultModel: "espnet/kan-bayashi_ljspeech_vits",
              provider: "huggingface",
            },
            {
              task: "textToImage",
              defaultModel: "black-forest-labs/FLUX.1-schnell",
              provider: "huggingface",
            },
            {
              task: "imageToText",
              defaultModel: "nlpconnect/vit-gpt2-image-captioning",
              provider: "huggingface",
            },
            {
              task: "summarization",
              defaultModel: "facebook/bart-large-cnn",
              provider: "huggingface",
            },
            {
              task: "questionAnswering",
              defaultModel: "deepset/roberta-base-squad2",
              provider: "huggingface",
            },
            {
              task: "imageSearch",
              defaultModel: "google_images (SERP API)",
              provider: "serpapi",
            },
            {
              task: "imageVerify",
              defaultModel: "gpt-4o (OpenAI) / gemini-1.5-flash (fallback)",
              provider: "openai/gemini",
            },
            {
              task: "enrichListing",
              defaultModel: "pipeline: imageSearch → imageVerify → fetch → place",
              provider: "internal",
            },
          ],
        },
        ctx,
      );
    }

    // GET / — API info
    return ok(
      {
        service: "api-v1-ai",
        version: VERSION,
        endpoints: {
          "POST /chat": "LLM chat completion (Groq)",
          "POST /embeddings": "Text embeddings (z.ai)",
          "POST /inference/:task":
            "HF inference (translation, textToSpeech, textToImage, imageToText, summarization, questionAnswering); imageSearch/imageVerify/enrichListing (real-photo pipeline: SERP API crawl, AI vision verify, orchestrator — service-auth only)",
          "GET /models": "List available models",
          "GET /health": "Provider health check",
        },
      },
      ctx,
    );
  }

  return { handleGet, handlePost };
}
