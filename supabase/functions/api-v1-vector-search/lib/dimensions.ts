/**
 * Embedding Dimension Normalization
 *
 * Truncate-or-pad to the 384d target all providers converge on.
 * Extracted from `api-v1-vector-search/index.ts` — no changes.
 */

import { TARGET_DIMENSIONS } from "./config.ts";

export function normalizeDimensions(
  embedding: number[],
  targetDim: number = TARGET_DIMENSIONS,
): number[] {
  if (embedding.length === targetDim) {
    return embedding;
  }
  if (embedding.length > targetDim) {
    // Truncate to target dimensions
    return embedding.slice(0, targetDim);
  }
  // Pad with zeros if shorter
  const padded = [...embedding];
  while (padded.length < targetDim) {
    padded.push(0);
  }
  return padded;
}
