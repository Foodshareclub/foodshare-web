/**
 * WebAssembly-Powered Vector Similarity & Reciprocal Rank Fusion Engine
 *
 * Direct bridge to `foodshare-search` WebAssembly module:
 * - Cosine similarity & L2 Euclidean distance for float vector embeddings
 * - Dimension normalization (384d for gte-small, 1536d for text-embedding-3)
 * - Reciprocal Rank Fusion (RRF) for combining vector & keyword search results
 * - High-speed fuzzy search & Levenshtein edit distance
 *
 * @module lib/wasm-search
 */

import { createLogger } from "@/lib/logger";
import {
  MAX_BATCH_LENGTH,
  MAX_VECTOR_LENGTH,
  requireArray,
  requireIdentifier,
  requireIntegerInRange,
  requireNonNegativeNumber,
  requirePositiveNumber,
  requireString,
  requireVector,
} from "@/lib/wasm-boundary";
import * as WasmSearch from "@/wasm/foodshare-search/foodshare_search";

const logger = createLogger("WasmSearch");

export interface RrfFusedItem {
  id: string | number;
  score: number;
}

/**
 * Compute cosine similarity between two float embedding vectors.
 */
export function cosineSimilarity(a: Float32Array | number[], b: Float32Array | number[]): number {
  return WasmSearch.vector_cosine_similarity(requireVector(a, "a"), requireVector(b, "b"));
}

/**
 * Compute Euclidean (L2) distance between two float embedding vectors.
 */
export function l2Distance(a: Float32Array | number[], b: Float32Array | number[]): number {
  return WasmSearch.vector_l2_distance(requireVector(a, "a"), requireVector(b, "b"));
}

/**
 * Pad or truncate vector to exact target dimensions (e.g. 384 for gte-small).
 *
 * The module allocates a vector of the size asked for, so the size is
 * held to the same limit as the vector that goes in.
 */
export function normalizeVectorDimensions(v: Float32Array | number[], targetDim = 384): Float32Array {
  return WasmSearch.vector_normalize_dimensions(
    requireVector(v, "v"),
    requireIntegerInRange(targetDim, "targetDim", 0, MAX_VECTOR_LENGTH),
  );
}

/**
 * Merge multiple ranked result lists using Reciprocal Rank Fusion (RRF).
 *
 * The module takes and returns JS arrays; there is no JSON roundtrip.
 *
 * Identifiers may be numbers or strings. The module works in strings, so
 * each distinct identifier is given a private key of its own and the
 * original value is put back afterwards, so a numeric id and the string
 * of the same digits stay distinct.
 *
 * Results are ordered by score, and items with equal scores keep the
 * order they first appeared in across the input lists. The module
 * collects scores in a hash map, whose iteration order is not stable
 * between runs, so the order is settled here.
 */
export function fuseRankedLists(lists: Array<Array<string | number>>, k = 60.0): RrfFusedItem[] {
  const smoothing = requireNonNegativeNumber(k, "k");
  const listArray = requireArray<Array<string | number>>(lists, "lists");
  // The module collects the scores of every identifier in a map, so the
  // number of identifiers is what decides how much it holds.
  const identifiers = listArray.reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
  if (identifiers > MAX_BATCH_LENGTH) {
    throw new RangeError(`lists must hold at most ${MAX_BATCH_LENGTH} identifiers, got ${identifiers}`);
  }
  const keyById = new Map<string | number, string>();
  const idByKey = new Map<string, string | number>();
  const firstSeen = new Map<string, number>();
  const keyed = listArray.map((list, listIndex) =>
    requireArray<string | number>(list, `lists[${listIndex}]`).map((id, idIndex) => {
      const identifier = requireIdentifier(id, `lists[${listIndex}][${idIndex}]`);
      const existing = keyById.get(identifier);
      if (existing !== undefined) return existing;
      const key = `k${keyById.size}`;
      keyById.set(identifier, key);
      idByKey.set(key, identifier);
      firstSeen.set(key, keyById.size - 1);
      return key;
    }),
  );

  try {
    const fused = WasmSearch.rrf_merge(keyed, smoothing) as Array<{ id: string; score: number }>;
    return fused
      .map((item) => ({
        id: idByKey.get(item.id) ?? item.id,
        score: item.score,
        order: firstSeen.get(item.id) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map(({ id, score }) => ({ id, score }));
  } catch (error) {
    logger.error(
      "WASM RRF merge failed, fusing in JavaScript instead",
      error instanceof Error ? error : new Error(String(error)),
    );
    return reciprocalRankFusion(listArray, smoothing);
  }
}

/**
 * The fusion the module does, in JavaScript.
 *
 * The module's answers are used when it can be reached. This is what the
 * bridge does when it cannot, and it is here so that the two can be
 * compared: a fallback that answered differently would be worse than no
 * answer at all.
 *
 * Results are ordered by score, and items with equal scores keep the
 * order they first appeared in across the input lists, which is the
 * order the module's answers are put in as well.
 */
export function reciprocalRankFusion(
  lists: Array<Array<string | number>>,
  k: number,
): RrfFusedItem[] {
  const scores = new Map<string | number, number>();
  const firstSeen = new Map<string | number, number>();

  for (const list of lists) {
    for (const [index, id] of list.entries()) {
      const rank = index + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
      if (!firstSeen.has(id)) {
        firstSeen.set(id, scores.size - 1);
      }
    }
  }

  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || (firstSeen.get(a.id) ?? 0) - (firstSeen.get(b.id) ?? 0));
}

/**
 * Calculate multi-level relevance score for fuzzy search.
 */
export function calculateRelevance(query: string, text: string): number {
  return WasmSearch.relevance_score(requireString(query, "query"), requireString(text, "text"));
}

/**
 * Turn a vector into the float array the module reads.
 *
 * A vector of the wrong length is not an error: the module measures the two
 * vectors against each other and answers with a similarity of zero when they
 * do not match, which is what a caller wants to see. A vector that is not
 * made of numbers at all is an error, because there is no sensible answer.
 */
function toVector(
  value: Float32Array | number[] | undefined,
  name: string,
): Float32Array | undefined {
  if (value === undefined || value === null) return undefined;
  return requireVector(value, name);
}

/**
 * Check an optional number that cannot be negative: a distance, or a share
 * of the score.
 *
 * A weight is a share of the score, and the module adds the weights up and
 * divides by the total, so a negative weight can make that total zero,
 * which answers with a score of infinity or of no value at all. A negative
 * distance is not a distance.
 */
function optionalNonNegative(
  value: number | undefined,
  name: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  return requireNonNegativeNumber(value, name);
}

/**
 * Check an optional half-life.
 *
 * The half-life has to be greater than zero. The module holds a half-life
 * of ten kilometres for a value of zero or less, which is a different
 * curve from the one that was asked for, and it answers with it as though
 * it were the one that was asked for.
 */
function optionalHalfLife(
  value: number | undefined,
  name: string,
): number | undefined {
  if (value === undefined || value === null) return undefined;
  return requirePositiveNumber(value, name);
}

/**
 * Calculate multi-modal hybrid score combining vector similarity, fuzzy text match, and geospatial decay.
 */
export function calculateHybridScore(options: {
  textQuery: string;
  targetText: string;
  queryVector?: Float32Array | number[];
  itemVector?: Float32Array | number[];
  distanceKm?: number;
  vectorWeight?: number;
  textWeight?: number;
  geoWeight?: number;
  halfLifeKm?: number;
}): number {
  const qVec = toVector(options.queryVector, "queryVector");
  const iVec = toVector(options.itemVector, "itemVector");

  return WasmSearch.hybrid_score(
    requireString(options.textQuery, "textQuery"),
    requireString(options.targetText, "targetText"),
    qVec,
    iVec,
    optionalNonNegative(options.distanceKm, "distanceKm"),
    optionalNonNegative(options.vectorWeight, "vectorWeight"),
    optionalNonNegative(options.textWeight, "textWeight"),
    optionalNonNegative(options.geoWeight, "geoWeight"),
    optionalHalfLife(options.halfLifeKm, "halfLifeKm"),
  );
}

/**
 * Calculate exponential geographic proximity decay score (0.0 to 1.0).
 *
 * The half-life has to be greater than zero. The module falls back to ten
 * kilometres for a half-life of zero or less, which is a different curve
 * from the one that was asked for, and answers with it as though it were
 * the one that was asked for.
 */
export function calculateDistanceDecay(distanceKm: number, halfLifeKm = 10.0): number {
  return WasmSearch.distance_decay(
    requireNonNegativeNumber(distanceKm, "distanceKm"),
    requirePositiveNumber(halfLifeKm, "halfLifeKm"),
  );
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
export function computeEditDistance(a: string, b: string): number {
  return WasmSearch.edit_distance(requireString(a, "a"), requireString(b, "b"));
}
