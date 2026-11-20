/**
 * AI Route Handlers (POST dispatch + GET info/models)
 *
 * Auth is per-route: chat/embeddings/inference require authentication; health/models
 * are public. Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { AuthenticationError, RateLimitError, ValidationError } from "../../_shared/errors.ts";
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

/**
 * Service-path rate limit for the enrichListing route (rework criterion (d)).
 *
 * enrichListing is service-auth only, and the user-quota RPC
 * (consume_image_upload_quota) takes a uuid user id — a string service key
 * cannot be cast to it (22P02), so the previous call fail-closed on EVERY
 * request and the consent-gated backfill could never run. This route instead
 * rides the estate's string-key distributed sliding-window limiter —
 * check_rate_limit(p_key text, p_limit int, p_window_ms bigint) on
 * rate_limit_entries, the same store the SERP limiter and the API handler
 * factory use — with a 30/min budget per post: the backfill paces itself at
 * ≤30/min and touches each post once per sweep, so the budget bounds
 * re-runs against a stuck post, not the sweep itself.
 *
 * Fail-closed: an RPC error or a non-verdict payload blocks the route; it
 * never unthrottles. check_rate_limit is overloaded in PostgreSQL (the
 * generated return type is `boolean | Json`), so only the JSONB sliding-
 * window verdict (allowed === true) is an allow — a scalar, which a wrong
 * overload resolution could return, is not.
 */
async function checkServiceEnrichLimit(
  postId: number,
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: `service-enrich-${postId}`,
    p_limit: 30,
    p_window_ms: 60_000,
  });
  if (error) {
    logger.error(
      "enrichListing service limit check failed (fail-closed)",
      new Error(error.message),
    );
    return false;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  return (data as { allowed?: unknown }).allowed === true;
}

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
            // Provenance inputs (close criterion (b)): the gate is
            // fail-closed on the tie to THIS listing, so a caller that
            // omits them gets the verdict it deserves — no tie, no pass.
            source_url: body.source_url as string | undefined,
            source_domain: body.source_domain as string | undefined,
            listing_website: body.listing_website as string | undefined,
            host_company: body.host_company as string | undefined,
            own_presence_urls: body.own_presence_urls as string[] | undefined,
            listing_lat: typeof body.listing_lat === "number" ? body.listing_lat : undefined,
            listing_lng: typeof body.listing_lng === "number" ? body.listing_lng : undefined,
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
        // Service-path rate limit (criterion (d)): string-key distributed
        // limiter, 30/min per post, fail-closed. See checkServiceEnrichLimit.
        if (!await checkServiceEnrichLimit(postId, ctx.supabase)) {
          throw new RateLimitError("Rate limit exceeded on enrichListing");
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
