/**
 * AI Route Handlers (POST dispatch + GET info/models)
 *
 * Auth is per-route: chat/embeddings require JWT, inference/health/models
 * are public. Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import { ValidationError } from "../../_shared/errors.ts";
import type { createHealthHandler } from "../../_shared/health-handler.ts";
import { logger } from "../../_shared/logger.ts";
import { getSubPath } from "./path.ts";
import { groqChat } from "./providers/groq.ts";
import { runHfInference } from "./providers/huggingface.ts";
import { zaiEmbeddings } from "./providers/zai.ts";
import type { PostBody } from "./schemas.ts";
import { VERSION } from "./config.ts";

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
      const task = subPath.split("/")[1];
      if (!task) throw new ValidationError("Inference task is required");

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
              defaultModel: "stabilityai/stable-diffusion-2",
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
            "HF inference (translation, textToSpeech, textToImage, imageToText, summarization, questionAnswering)",
          "GET /models": "List available models",
          "GET /health": "Provider health check",
        },
      },
      ctx,
    );
  }

  return { handleGet, handlePost };
}
