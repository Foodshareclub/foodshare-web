/**
 * SERP API Google Image Search — fridge/foodbank real-photo pipeline, stage 0.
 *
 * POST /inference/imageSearch (service-auth only). Crawls Google Images via
 * SerpApi for photographs of a NAMED community fridge / food bank and returns
 * up to 10 candidate URLs, each carrying source-page provenance
 * (`source_url` + `source_domain`) so the verify stage can tie a candidate to
 * the listing's own web presence. Architect adjudication on t_9f8c0fd228: the
 * ask is a real photograph of THE place, not a generic fridge — provenance is
 * the material that makes that decidable downstream.
 *
 * This endpoint never fetches candidate URLs; it only returns them. Fetching
 * candidates is the orchestrator's gated surface (SSRF review lives there).
 * The only outbound request here is the fixed `serpapi.com/search.json` host.
 *
 * Budget protection, two layers:
 *   1. Distributed sliding-window rate limit (shared `check_rate_limit` RPC)
 *      consumed once per SERP HTTP call — the fallback query consumes its own
 *      slot. Cache hits never touch the limiter.
 *   2. Cache keyed by the SHA-256 of the normalized query input: process-local
 *      LRU first, `inference_cache` table second (the estate's canonical AI
 *      cache contract, same as `lib/cache.ts`). NOTE: `inference_cache` is not
 *      in the schema catalog today, so the DB tier degrades to a miss exactly
 *      like the HF inference cache does; the memory tier and the durable rate
 *      limiter still hold. Creating the table is a schema decision tracked on
 *      the wave card, not here.
 *
 * A specific name+location query that yields nothing falls back ONCE to the
 * broader city+state query. Zero candidates is a value, not an error — the
 * pipeline falls through to the covers-wave generation floor.
 *
 * Credentials: `SERPAPI_API_KEY` via Vault (`getSecret`, env fallback inside).
 * Fingerprint-only on records: the key never appears in logs, errors, or
 * responses, and the request URL (which carries it) is never logged.
 *
 * @module api-v1-ai/lib/providers/image-search
 */

import { RateLimitError, ServerError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import {
  checkDistributedRateLimit,
  type RateLimitConfig,
  type RateLimitResult,
} from "../../../_shared/rate-limiter.ts";
import { getSecret } from "../../../_shared/vault.ts";

// =============================================================================
// Types
// =============================================================================

export interface ImageSearchInput {
  name: string;
  city?: string;
  state?: string;
  post_type: "fridge" | "foodbank";
  max_results?: number;
}

export interface ImageCandidate {
  /** Direct image URL (SerpApi `original`). */
  url: string;
  thumbnail?: string;
  title?: string;
  /** Source site name as reported by SerpApi (display string, not a URL). */
  source?: string;
  /** Page that hosts the image (SerpApi `link`) — provenance anchor. */
  source_url?: string;
  /** Hostname of `source_url` — the domain-tie material for verify. */
  source_domain?: string;
  width?: number;
  height?: number;
}

export interface ImageSearchResult {
  candidates: ImageCandidate[];
  /** The query that produced these candidates (fallback query if it fired). */
  query: string;
  /** "name" = specific name+location query; "location" = broader fallback. */
  scope: "name" | "location";
  total_found: number;
  cached: boolean;
  cache_source?: "memory" | "database";
}

/** Test seams, same injection shape as api-v1-products/lib/listing-cover-search.ts. */
export interface ImageSearchDeps {
  apiKey?: string;
  fetch?: typeof fetch;
  checkLimit?: (key: string, config: RateLimitConfig) => Promise<RateLimitResult>;
}

// =============================================================================
// Constants
// =============================================================================

export const IMAGE_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const SERP_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowMs: 60 * 60 * 1000, // 30 SERP calls per hour, estate-wide
  keyPrefix: "serp-image-search",
};
const MAX_CANDIDATES = 10;
const SERP_FETCH_RESULTS = 20; // headroom so filtering still yields 10
const MEMORY_CACHE_MAX = 100;
const SERP_TIMEOUT_MS = 15_000;

const memoryCache = new Map<string, { result: ImageSearchResult; expiresAt: number }>();

// =============================================================================
// Query + cache key helpers (exported for tests)
// =============================================================================

function clean(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clampMax(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return MAX_CANDIDATES;
  return Math.max(1, Math.min(MAX_CANDIDATES, Math.floor(value)));
}

export function searchQueries(
  input: ImageSearchInput,
): { primary: string; fallback: string | null } {
  const typeLabel = input.post_type === "fridge" ? "community fridge" : "food bank";
  const location = [clean(input.city), clean(input.state)].filter(Boolean).join(", ");
  const name = clean(input.name);
  const primary = location ? `${name} ${typeLabel} ${location}` : `${name} ${typeLabel}`;
  // Card fallback: broader query (city+state) — only when a location exists.
  const fallback = location ? `${typeLabel} ${location}` : null;
  return { primary, fallback };
}

/** SHA-256 over the normalized input — unicode-safe (btoa is not). */
export async function imageSearchCacheKey(input: ImageSearchInput): Promise<string> {
  const normalized = {
    name: clean(input.name).toLowerCase(),
    city: clean(input.city).toLowerCase(),
    state: clean(input.state).toLowerCase(),
    post_type: input.post_type,
    max_results: clampMax(input.max_results),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(normalized));
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `imageSearch:${hex}`;
}

/** Map SerpApi `images_results` to candidates, keeping source provenance. */
export function serpCandidates(images: unknown, max: number): ImageCandidate[] {
  if (!Array.isArray(images)) return [];
  const out: ImageCandidate[] = [];
  for (const entry of images) {
    if (!entry || typeof entry !== "object") continue;
    const img = entry as Record<string, unknown>;
    if (typeof img.original !== "string" || !img.original) continue;
    const sourceUrl = typeof img.link === "string" && img.link ? img.link : undefined;
    let sourceDomain: string | undefined;
    if (sourceUrl) {
      try {
        sourceDomain = new URL(sourceUrl).hostname;
      } catch {
        // Opaque source link — keep the candidate, provenance stays partial.
      }
    }
    out.push({
      url: img.original,
      thumbnail: typeof img.thumbnail === "string" ? img.thumbnail : undefined,
      title: typeof img.title === "string" ? img.title : undefined,
      source: typeof img.source === "string" ? img.source : undefined,
      source_url: sourceUrl,
      source_domain: sourceDomain,
      width: typeof img.original_width === "number" ? img.original_width : undefined,
      height: typeof img.original_height === "number" ? img.original_height : undefined,
    });
    if (out.length >= max) break;
  }
  return out;
}

// =============================================================================
// Cache tiers
// =============================================================================

function readMemoryCache(key: string): ImageSearchResult | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.result;
}

function writeMemoryCache(key: string, result: ImageSearchResult): void {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { result, expiresAt: Date.now() + IMAGE_SEARCH_CACHE_TTL_MS });
}

async function readDbCache(
  key: string,
  // deno-lint-ignore no-explicit-any -- estate cache contract (lib/cache.ts): inference_cache is outside the generated schema
  supabase: any,
): Promise<ImageSearchResult | null> {
  // Same shape as lib/cache.ts: a missing/unavailable table degrades to a miss.
  const { data } = await supabase
    .from("inference_cache")
    .select("result,created_at")
    .eq("cache_key", key)
    .gte("created_at", new Date(Date.now() - IMAGE_SEARCH_CACHE_TTL_MS).toISOString())
    .single();
  if (data?.result) return data.result as ImageSearchResult;
  return null;
}

function writeDbCache(
  key: string,
  result: ImageSearchResult,
  // deno-lint-ignore no-explicit-any -- estate cache contract (lib/cache.ts)
  supabase: any,
): void {
  supabase
    .from("inference_cache")
    .upsert({
      cache_key: key,
      result,
      created_at: new Date().toISOString(),
    })
    .then(() => {})
    .catch((err: Error) => logger.warn("imageSearch cache write failed", { error: err.message }));
}

// =============================================================================
// SERP call
// =============================================================================

async function serpSearch(
  query: string,
  apiKey: string,
  doFetch: typeof fetch,
  checkLimit: (key: string, config: RateLimitConfig) => Promise<RateLimitResult>,
): Promise<{ candidates: ImageCandidate[]; totalFound: number }> {
  const limit = await checkLimit("global", SERP_RATE_LIMIT);
  if (!limit.allowed) {
    throw new RateLimitError(
      `SERP search budget exceeded; retry in ${Math.ceil(limit.retryAfterMs / 1000)}s`,
    );
  }

  const params = new URLSearchParams({
    engine: "google_images",
    q: query,
    api_key: apiKey,
    num: String(SERP_FETCH_RESULTS),
    safe: "active",
    tbs: "itp:photo", // photographs only — the pipeline places real photos
  });
  // The URL carries the key: never log it, never echo it in an error.
  const resp = await doFetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(SERP_TIMEOUT_MS),
  });

  if (!resp.ok) {
    logger.warn("SERP API error", { status: resp.status, query });
    if (resp.status === 429) throw new RateLimitError("SERP API rate limit exceeded");
    if (resp.status === 401 || resp.status === 403) {
      throw new ServerError("SERP API credential rejected (SERPAPI_API_KEY)");
    }
    throw new ServerError(`SERP API returned ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  if (typeof data.error === "string") {
    // SerpApi reports account/search failures in-band with HTTP 200.
    throw new ServerError(`SERP API: ${data.error.slice(0, 120)}`);
  }
  const images = data.images_results;
  return {
    candidates: serpCandidates(images, MAX_CANDIDATES),
    totalFound: Array.isArray(images) ? images.length : 0,
  };
}

// =============================================================================
// Entry point
// =============================================================================

export async function imageSearch(
  input: ImageSearchInput,
  // deno-lint-ignore no-explicit-any -- estate cache contract (lib/cache.ts)
  supabase: any,
  deps: ImageSearchDeps = {},
): Promise<ImageSearchResult> {
  if (!clean(input.name)) throw new ValidationError("name is required");
  if (input.post_type !== "fridge" && input.post_type !== "foodbank") {
    throw new ValidationError("post_type must be fridge or foodbank");
  }

  const apiKey = deps.apiKey ?? await getSecret("SERPAPI_API_KEY");
  if (!apiKey) throw new ServerError("SERPAPI_API_KEY is not configured");

  const doFetch = deps.fetch ?? globalThis.fetch;
  const checkLimit = deps.checkLimit ?? checkDistributedRateLimit;
  const max = clampMax(input.max_results);
  const { primary, fallback } = searchQueries(input);

  const cacheKey = await imageSearchCacheKey(input);
  const memoryHit = readMemoryCache(cacheKey);
  if (memoryHit) {
    return { ...memoryHit, cached: true, cache_source: "memory" };
  }
  const dbHit = await readDbCache(cacheKey, supabase);
  if (dbHit) {
    writeMemoryCache(cacheKey, dbHit);
    return { ...dbHit, cached: true, cache_source: "database" };
  }

  let { candidates, totalFound } = await serpSearch(primary, apiKey, doFetch, checkLimit);
  let query = primary;
  let scope: ImageSearchResult["scope"] = "name";

  if (candidates.length === 0 && fallback) {
    const broader = await serpSearch(fallback, apiKey, doFetch, checkLimit);
    candidates = broader.candidates;
    totalFound = broader.totalFound;
    query = fallback;
    scope = "location";
  }

  const result: ImageSearchResult = {
    candidates: candidates.slice(0, max),
    query,
    scope,
    total_found: totalFound,
    cached: false,
  };
  writeMemoryCache(cacheKey, result);
  writeDbCache(cacheKey, result, supabase);
  logger.info("imageSearch complete", {
    query,
    scope,
    found: result.candidates.length,
    domains: result.candidates.map((c) => c.source_domain).filter(Boolean),
  });
  return result;
}
