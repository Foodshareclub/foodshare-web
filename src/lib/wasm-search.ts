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
import { requireFiniteNumber, requireNumberArray, requireString } from "@/lib/wasm-boundary";
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
  const f32A = a instanceof Float32Array ? a : new Float32Array(a);
  const f32B = b instanceof Float32Array ? b : new Float32Array(b);
  return WasmSearch.vector_cosine_similarity(f32A, f32B);
}

/**
 * Compute Euclidean (L2) distance between two float embedding vectors.
 */
export function l2Distance(a: Float32Array | number[], b: Float32Array | number[]): number {
  const f32A = a instanceof Float32Array ? a : new Float32Array(a);
  const f32B = b instanceof Float32Array ? b : new Float32Array(b);
  return WasmSearch.vector_l2_distance(f32A, f32B);
}

/**
 * Pad or truncate vector to exact target dimensions (e.g. 384 for gte-small).
 */
export function normalizeVectorDimensions(v: Float32Array | number[], targetDim = 384): Float32Array {
  const f32V = v instanceof Float32Array ? v : new Float32Array(v);
  return WasmSearch.vector_normalize_dimensions(f32V, targetDim);
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
  const keyById = new Map<string | number, string>();
  const idByKey = new Map<string, string | number>();
  const firstSeen = new Map<string, number>();
  const keyed = lists.map((list) =>
    list.map((id) => {
      const existing = keyById.get(id);
      if (existing !== undefined) return existing;
      const key = `k${keyById.size}`;
      keyById.set(id, key);
      idByKey.set(key, id);
      firstSeen.set(key, keyById.size - 1);
      return key;
    }),
  );

  try {
    const fused = WasmSearch.rrf_merge(keyed, k) as Array<{ id: string; score: number }>;
    return fused
      .map((item) => ({
        id: idByKey.get(item.id) ?? item.id,
        score: item.score,
        order: firstSeen.get(item.id) ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map(({ id, score }) => ({ id, score }));
  } catch (error) {
    logger.error("WASM RRF merge failed", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
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
  if (value instanceof Float32Array) return value;
  const numbers = requireNumberArray(value, name);
  return numbers ? new Float32Array(numbers) : undefined;
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
    options.distanceKm,
    options.vectorWeight,
    options.textWeight,
    options.geoWeight,
    options.halfLifeKm,
  );
}

/**
 * Calculate exponential geographic proximity decay score (0.0 to 1.0).
 */
export function calculateDistanceDecay(distanceKm: number, halfLifeKm = 10.0): number {
  return WasmSearch.distance_decay(
    requireFiniteNumber(distanceKm, "distanceKm"),
    requireFiniteNumber(halfLifeKm, "halfLifeKm"),
  );
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
export function computeEditDistance(a: string, b: string): number {
  return WasmSearch.edit_distance(requireString(a, "a"), requireString(b, "b"));
}
