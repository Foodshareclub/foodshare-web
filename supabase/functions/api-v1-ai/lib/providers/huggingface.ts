/**
 * HuggingFace Inference Provider
 *
 * Task-dispatched inference (translation, TTS, TTI, ITT, summarization,
 * QA) with cache lookup before remote call.
 * Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { ServerError, ValidationError } from "../../../_shared/errors.ts";
import { downloadImage } from "../../../_shared/image-utils.ts";
import { generateCacheKey, getCachedResult, setCachedResult } from "../cache.ts";
import type { PostBody } from "../schemas.ts";

/**
 * Fetch a caller-supplied image URL for imageToText through the SSRF gate.
 * `downloadImage` validates + resolves before any connection (private and
 * metadata hosts rejected, https-only), pins the connection to the validated
 * IP, refuses redirects, and caps time (10 s) and size (10 MiB).
 */
export async function fetchImageBlob(imageUrl: string): Promise<Blob> {
  try {
    return new Blob([new Uint8Array(await downloadImage(imageUrl))]);
  } catch (err) {
    throw new ValidationError(
      `imageUrl could not be fetched: ${
        String(err instanceof Error ? err.message : err).slice(0, 160)
      }`,
    );
  }
}

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

  // Binary output must not use the JSON cache (or its truncated base64 key).
  // The current SDK routes through supported inference providers.
  if (task === "textToImage") {
    const { InferenceClient } = await import("@huggingface/inference");
    const hf = new InferenceClient(hfToken);
    const result = await hf.textToImage({
      provider: "fal-ai",
      model: body?.model || "black-forest-labs/FLUX.1-schnell",
      inputs: (body?.inputs as string) || "",
      parameters: { width: 768, height: 768, num_inference_steps: 4 },
    }, { signal: AbortSignal.timeout(45_000) });
    return { result, contentType: result.type || "image/jpeg", cached: false };
  }

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

    case "imageToText": {
      const imageData = body?.imageUrl ? await fetchImageBlob(body.imageUrl) : body?.imageData;
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
