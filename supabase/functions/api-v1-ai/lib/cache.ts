/**
 * HF Inference Cache (memory + database)
 *
 * Two-tier lookup: process-local LRU map first, `inference_cache` table
 * second. Writes are fire-and-forget.
 * Extracted from `api-v1-ai/index.ts` — no logic changes.
 */

import { logger } from "../../_shared/logger.ts";
import { HF_CACHE_TTL, MAX_INFERENCE_CACHE_SIZE } from "./config.ts";

const inferenceCache = new Map<
  string,
  { result: unknown; timestamp: number; hits: number }
>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inferenceCache.entries()) {
    if (now - value.timestamp > HF_CACHE_TTL) {
      inferenceCache.delete(key);
    }
  }
}, 300000);

export function generateCacheKey(
  model: string,
  inputs: unknown,
  params?: unknown,
): string {
  return btoa(JSON.stringify({ model, inputs, params })).slice(0, 64);
}

export async function getCachedResult(
  cacheKey: string,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ result: unknown; source: string } | null> {
  const cached = inferenceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HF_CACHE_TTL) {
    cached.hits++;
    return { result: cached.result, source: "memory" };
  }

  const { data } = await supabase
    .from("inference_cache")
    .select("result,created_at")
    .eq("cache_key", cacheKey)
    .gte("created_at", new Date(Date.now() - HF_CACHE_TTL).toISOString())
    .single();

  if (data) {
    inferenceCache.set(cacheKey, {
      result: data.result,
      timestamp: Date.now(),
      hits: 1,
    });
    return { result: data.result, source: "database" };
  }

  return null;
}

// deno-lint-ignore no-explicit-any
export async function setCachedResult(
  cacheKey: string,
  result: unknown,
  supabase: any,
): Promise<void> {
  // Evict oldest if cache is full
  if (inferenceCache.size >= MAX_INFERENCE_CACHE_SIZE) {
    const firstKey = inferenceCache.keys().next().value;
    if (firstKey) inferenceCache.delete(firstKey);
  }
  inferenceCache.set(cacheKey, { result, timestamp: Date.now(), hits: 1 });
  supabase
    .from("inference_cache")
    .upsert({
      cache_key: cacheKey,
      result,
      created_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch((err: Error) => logger.warn("Cache write failed", { error: err.message }));
}
