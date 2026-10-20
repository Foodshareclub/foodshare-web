/**
 * Embedding Generation Providers
 *
 * Graceful degradation chain: Supabase.ai (local ONNX) → z.ai → HuggingFace.
 * Extracted from `api-v1-vector-search/index.ts` — no logic changes.
 */

import { AppError } from "../../_shared/errors.ts";
import { TARGET_DIMENSIONS } from "./config.ts";
import { normalizeDimensions } from "./dimensions.ts";
import { getEdgeAiSession, getHfKey, getZaiKey } from "./edge-ai.ts";

export interface EmbeddingOutput {
  embedding: number[];
  provider: "supabase_ai" | "z_ai" | "huggingface";
  model: string;
}

export async function generateVectorEmbedding(
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
