/**
 * HuggingFace Inference Provider
 *
 * Task-dispatched inference (translation, TTS, TTI, ITT, summarization,
 * QA) with cache lookup before remote call.
 * Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { ServerError, ValidationError } from "../../../_shared/errors.ts";
import { generateCacheKey, getCachedResult, setCachedResult } from "../cache.ts";
import type { PostBody } from "../schemas.ts";

export async function runHfInference(
  task: string,
  body: PostBody,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  _requestId: string,
): Promise<
  {
    result: unknown;
    contentType: string;
    cached: boolean;
    cacheSource?: string;
  }
> {
  const hfToken = Deno.env.get("HUGGINGFACE_ACCESS_TOKEN");
  if (!hfToken) throw new ServerError("Missing HUGGINGFACE_ACCESS_TOKEN");

  const model = body?.model || task;
  const cacheKey = generateCacheKey(
    model,
    body?.inputs || body?.input,
    body?.parameters,
  );

  const cached = await getCachedResult(cacheKey, supabase);
  if (cached) {
    return {
      result: cached.result,
      contentType: "application/json",
      cached: true,
      cacheSource: cached.source,
    };
  }

  const { HfInference } = await import("@huggingface/inference");
  const hf = new HfInference(hfToken);
  let result: unknown;
  let contentType = "application/json";

  switch (task) {
    case "translation":
      result = await hf.translation({
        model: body?.model || "t5-base",
        inputs: (body?.inputs as string) || "",
      });
      break;

    case "textToSpeech": {
      result = await hf.textToSpeech({
        model: body?.model || "espnet/kan-bayashi_ljspeech_vits",
        inputs: (body?.inputs as string) || "",
      });
      contentType = "audio/wav";
      break;
    }

    case "textToImage": {
      result = await hf.textToImage({
        model: body?.model || "stabilityai/stable-diffusion-2",
        inputs: (body?.inputs as string) || "",
        parameters: body?.parameters,
      });
      contentType = "image/png";
      break;
    }

    case "imageToText": {
      const imageData = body?.imageUrl
        ? await (await fetch(body.imageUrl)).blob()
        : body?.imageData;
      result = await hf.imageToText({
        data: imageData as Blob,
        model: body?.model || "nlpconnect/vit-gpt2-image-captioning",
      });
      break;
    }

    case "summarization":
      result = await hf.summarization({
        model: body?.model || "facebook/bart-large-cnn",
        inputs: (body?.inputs as string) || "",
        parameters: body?.parameters,
      });
      break;

    case "questionAnswering":
      result = await hf.questionAnswering({
        model: body?.model || "deepset/roberta-base-squad2",
        inputs: {
          question: body?.question || "",
          context: body?.context || "",
        },
      });
      break;

    default:
      throw new ValidationError(`Unknown inference task: ${task}`);
  }

  if (contentType === "application/json") {
    await setCachedResult(cacheKey, result, supabase);
  }

  return { result, contentType, cached: false };
}
