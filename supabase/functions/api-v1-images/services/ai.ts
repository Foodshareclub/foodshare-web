/**
 * AI Image Analysis Service
 * @module api-v1-images/services/ai
 */

import type { AIData } from "../types/index.ts";
import { logger } from "../../_shared/logger.ts";
import { getSecretSync } from "../../_shared/vault.ts";

export async function analyzeImage(imageUrl: string): Promise<AIData | null> {
  // HUGGINGFACE_ACCESS_TOKEN, not HUGGINGFACE_TOKEN: this file was the only
  // reader using the shorter name, so deploy.sh's `HUGGINGFACE_` prefix synced
  // the credential under a key nothing looked up, and this call could only ever
  // have been satisfied by a hand-written env entry.
  const HF_TOKEN = getSecretSync("HUGGINGFACE_ACCESS_TOKEN");

  if (!HF_TOKEN) {
    logger.warn("HuggingFace token not configured, skipping AI analysis");
    return null;
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/nateraw/food",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: imageUrl }),
      },
    );

    if (!response.ok) {
      logger.warn("AI analysis failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const predictions = await response.json();

    if (!Array.isArray(predictions) || predictions.length === 0) {
      return null;
    }

    // Take top 5 predictions
    const topPredictions = predictions.slice(0, 5);

    return {
      tags: topPredictions.map((p: any) => p.label),
      confidence: topPredictions.map((p: any) => p.score),
      category: topPredictions[0]?.label,
    };
  } catch (error) {
    logger.warn("AI analysis error", { error });
    return null;
  }
}
