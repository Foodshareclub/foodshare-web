/* tslint:disable */
/* eslint-disable */

/**
 * Calculate exponential geospatial proximity decay in WebAssembly.
 */
export function distance_decay(distance_km: number, half_life_km?: number | null): number;

/**
 * Calculate Levenshtein edit distance between two strings.
 */
export function edit_distance(a: string, b: string): number;

/**
 * Check if text contains a fuzzy match for query.
 *
 * Returns true if all characters in query appear in text in order.
 */
export function fuzzy_contains(query: string, text: string): boolean;

/**
 * Calculate multi-modal hybrid score in WebAssembly.
 */
export function hybrid_score(
  text_query: string,
  target_text: string,
  query_vector?: Float32Array | null,
  item_vector?: Float32Array | null,
  distance_km?: number | null,
  vector_weight?: number | null,
  text_weight?: number | null,
  geo_weight?: number | null,
  half_life_km?: number | null
): number;

/**
 * Calculate relevance score for a query against text.
 *
 * # Arguments
 * * `query` - Search query
 * * `text` - Text to match against
 *
 * # Returns
 * Relevance score (0-50, higher is better)
 */
export function relevance_score(query: string, text: string): number;

/**
 * Merge ranked result lists using Reciprocal Rank Fusion in WebAssembly.
 *
 * # Arguments
 * * `lists_json` - JSON 2D array of item IDs: `[["item1", "item2"], ["item2", "item3"]]`
 * * `k` - RRF smoothing parameter (default 60.0)
 */
export function rrf_merge(lists_json: string, k?: number | null): string;

/**
 * Search items and return sorted results as JSON.
 *
 * # Arguments
 * * `query` - Search query
 * * `items_json` - JSON array of items with `id` and `text` fields
 * * `max_results` - Maximum results to return (0 for all)
 *
 * # Returns
 * JSON array of results with `id` and `score` fields, sorted by score
 */
export function search_items(query: string, items_json: string, max_results: number): string;

/**
 * Calculate cosine similarity between two float arrays in WebAssembly.
 */
export function vector_cosine_similarity(a: Float32Array, b: Float32Array): number;

/**
 * Calculate Euclidean (L2) distance between two float arrays in WebAssembly.
 */
export function vector_l2_distance(a: Float32Array, b: Float32Array): number;

/**
 * Pad or truncate vector to exact target dimensions (e.g. 384 for gte-small).
 */
export function vector_normalize_dimensions(v: Float32Array, target_dim: number): Float32Array;
