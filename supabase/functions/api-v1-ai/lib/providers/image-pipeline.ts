/**
 * Image Pipeline Provider — real-photograph crawl + verify for fridge/foodbank listings.
 *
 * Two tasks:
 *   imageSearch  — SERP API (Google Images) crawl by listing name + location
 *   imageVerify  — AI vision (OpenAI GPT-4V / Gemini) verification of candidates
 *
 * Design: idempotent, rate-limited, cached, provenance-tracked.
 * Services: SERPAPI_API_KEY, OPENAI_API_KEY (or GEMINI_API_KEY fallback).
 * All credential access via Deno.env (vault-synced). Fingerprint-only on records.
 *
 * @module api-v1-ai/lib/providers/image-pipeline
 */

import { ServerError, ValidationError } from "../../../_shared/errors.ts";
import { logger } from "../../../_shared/logger.ts";
import { fetchPinned, resolveAndValidateUrl } from "../../../_shared/url-validation.ts";
import ExifReader from "exifreader";
import JPEG from "jpeg-js";
import { Buffer } from "node:buffer";
import { generateCacheKey, getCachedResult, setCachedResult } from "../cache.ts";
import { createListingCover } from "../../../api-v1-products/lib/listing-cover.ts";

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
  url: string;
  thumbnail?: string;
  title?: string;
  source?: string;
  width?: number;
  height?: number;
}

export interface ImageSearchResult {
  candidates: ImageCandidate[];
  query: string;
  total_found: number;
}

export interface ImageVerifyInput {
  image_url: string;
  listing_name: string;
  listing_address?: string;
  post_type: "fridge" | "foodbank";
  // Provenance: where the candidate came from, and the location's own web
  // presence. The gate is fail-closed — without a tie to THIS listing, no
  // vision score can place a photo. A real photo of a different, similar
  // facility must not pass. (Lead close criterion (b).)
  source_url?: string;
  source_domain?: string;
  listing_website?: string;
  host_company?: string;
  own_presence_urls?: string[];
  listing_lat?: number;
  listing_lng?: number;
}

/** Which signal established a provenance tie to THIS specific listing. */
export type ProvenanceBasis =
  | "listing_website"
  | "host_company"
  | "own_presence"
  | "maps_social_signage"
  | "exif_gps"
  | "none";

export interface ProvenanceVerdict {
  /** Whether the candidate is tied to THIS specific listing. */
  tie: boolean;
  /** Which signal established the tie ("none" when there is no tie). */
  basis: ProvenanceBasis;
  /** The candidate's source page domain, when known. */
  source_domain: string | null;
}

export interface ImageVerifyResult {
  pass: boolean;
  score: number;
  description: string;
  is_real_photo: boolean;
  /** Vision match AND provenance tie — a real photo of another facility is false. */
  matches_listing: boolean;
  model: string;
  provenance: ProvenanceVerdict;
  /** dHash (64-bit, hex) of the fetched bytes, when decodable. */
  perceptual_hash?: string;
  /** True when the stock/placeholder corpus hard-rejected the candidate. */
  stock_rejected?: boolean;
}

// =============================================================================
// imageSearch — SERP API Google Image Search
// =============================================================================

export async function imageSearch(
  input: ImageSearchInput,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<ImageSearchResult> {
  const serpKey = Deno.env.get("SERPAPI_API_KEY");
  if (!serpKey) throw new ServerError("Missing SERPAPI_API_KEY");

  if (!input.name?.trim()) throw new ValidationError("name is required");

  // Build the search query: specific name + location for precision
  const location = [input.city, input.state].filter(Boolean).join(", ");
  const typeLabel = input.post_type === "fridge" ? "community fridge" : "food bank";
  const query = location ? `${input.name} ${typeLabel} ${location}` : `${input.name} ${typeLabel}`;

  // Cache check (SERP rate limit: 100 req/day free tier)
  const cacheKey = generateCacheKey("imageSearch", query, { max: input.max_results || 10 });
  const cached = await getCachedResult(cacheKey, supabase);
  if (cached) {
    return cached.result as ImageSearchResult;
  }

  const params = new URLSearchParams({
    engine: "google_images",
    q: query,
    api_key: serpKey,
    num: String(Math.min(input.max_results || 10, 20)),
    safe: "active",
    // Prefer real photographs over illustrations/stock
    tbs: "itp:photo",
  });

  const resp = await fetch(`https://serpapi.com/search.json?${params}`, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    logger.warn("SERP API error", { status: resp.status, body: text.slice(0, 200) });
    // Fallback: broader query without the specific name
    if (location && resp.status === 429) {
      throw new ServerError("SERP rate limit exceeded — retry later");
    }
    throw new ServerError(`SERP API returned ${resp.status}`);
  }

  const data = await resp.json();
  const images = data.images_results || [];

  const candidates: ImageCandidate[] = images
    .filter((img: Record<string, unknown>) => img.original && typeof img.original === "string")
    .slice(0, input.max_results || 10)
    .map((img: Record<string, unknown>) => ({
      url: img.original as string,
      thumbnail: (img.thumbnail as string) || undefined,
      title: (img.title as string) || undefined,
      source: (img.source as string) || undefined,
      width: (img.original_width as number) || undefined,
      height: (img.original_height as number) || undefined,
    }));

  const result: ImageSearchResult = {
    candidates,
    query,
    total_found: images.length,
  };

  // Cache for 24h (SERP results are stable)
  await setCachedResult(cacheKey, result, supabase);

  logger.info("imageSearch complete", { query, found: candidates.length });
  return result;
}

// =============================================================================
// imageVerify — AI vision verification (OpenAI GPT-4V, Gemini fallback)
// =============================================================================

const VERIFY_PROMPT =
  `You are verifying whether an image is a real photograph of a SPECIFIC community food-sharing facility.

Listing: "{name}" ({type})
Address: "{address}"

Analyze the image and answer in JSON:
{
  "is_real_photo": boolean,     // true only if this is an authentic photograph (not illustration, 3D render, stock photo, or screenshot)
  "matches_listing": boolean,   // true only if the image depicts THIS specific facility — signage, building, or street context identifiable as "{name}" at the listed location. A generic or merely similar facility is false.
  "signage_matches_name": boolean, // true only if visible signage or text in the image matches or plausibly references "{name}"
  "is_outdoor_physical": boolean, // true if it shows a physical outdoor/indoor facility (fridge, pantry, building)
  "score": number,              // 0.0-1.0 confidence that this is a real photograph of THIS specific facility
  "description": string         // one-sentence description of what the image shows
}

Be strict: reject stock photos, illustrations, logos, maps, screenshots, and any image that could equally depict a different, similar facility.`;

// Maps/social hosts: a photo hosted there only ties to the listing when the
// image's own signage matches the listing name (the vision model's call).
const MAPS_SOCIAL_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "maps.google.com",
  "google.com",
  "yelp.com",
  "foursquare.com",
  "waze.com",
];

// Geotag signal: EXIF GPS within this radius of the listing coordinates ties
// the photo to the location. Absence of EXIF is not a negative.
const EXIF_GPS_TIE_RADIUS_M = 150;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Below this floor the bytes cannot be a usable photograph; the verify
// verdict fails closed rather than asking vision to opine on an icon.
const MIN_IMAGE_BYTES = 5_000;

// =============================================================================
// Stock/placeholder dedup — perceptual hash (dHash)
// =============================================================================
//
// The architect addendum: a stock/placeholder candidate is a HARD reject
// before any vision quota is spent. The corpus is the estate's own
// placeholder assets (fingerprint-only: dHash values below, not the images).

const DHASH_WIDTH = 9;
const DHASH_HEIGHT = 8;
/** Max differing bits (of 64) to count as the same asset. */
const STOCK_HAMMING_THRESHOLD = 5;

/**
 * The estate's own placeholder assets, hashed at implementation time from
 * foodshare-web/public/placeholders/ (fingerprint-only record: dHashes, not
 * the images). Extend the stock fingerprint set without code changes via the
 * STOCK_IMAGE_HASHES env var (comma-separated 16-hex-digit dHashes).
 */
const PLACEHOLDER_DHASHES: readonly string[] = [
  // foodshare-web/public/placeholders/fridge.jpg
  "f3f3f3f3bfffedfd",
  // foodshare-web/public/placeholders/foodbank.jpg
  "01103131442c2920",
];

/**
 * dHash (hex, 16 chars) of a JPEG buffer, or null when undecodable. Decode
 * is pure JS (jpeg-js) — the edge runtime has no FFI, so native image
 * codecs are not an option. Null means "dedup does not apply": verify
 * proceeds on the provenance + vision gate alone.
 */
export async function perceptualHashHex(
  bytes: Uint8Array,
): Promise<string | null> {
  try {
    const { data, width, height } = JPEG.decode(bytes, {
      maxMemoryUsageInMB: 64,
    });
    const grid = downscaleLuma(data, width, height, DHASH_WIDTH, DHASH_HEIGHT);
    let bits = 0n;
    for (let y = 0; y < DHASH_HEIGHT; y++) {
      for (let x = 0; x < DHASH_WIDTH - 1; x++) {
        bits = (bits << 1n) |
          (grid[y * DHASH_WIDTH + x] > grid[y * DHASH_WIDTH + x + 1] ? 1n : 0n);
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

/**
 * Downscale an RGBA buffer to w x h, returning a row-major luma grid.
 * Area sampling: each destination pixel averages its source tile; large
 * tiles are sampled on a stride to keep the cost bounded.
 */
function downscaleLuma(
  data: Uint8Array,
  srcW: number,
  srcH: number,
  w: number,
  h: number,
): number[] {
  const out = new Array<number>(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor((y / h) * srcH);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) / h) * srcH));
    const ys = Math.max(1, Math.floor((y1 - y0) / 16));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor((x / w) * srcW);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) / w) * srcW));
      const xs = Math.max(1, Math.floor((x1 - x0) / 16));
      let sum = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy += ys) {
        for (let sx = x0; sx < x1; sx += xs) {
          const i = (sy * srcW + sx) * 4;
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          n++;
        }
      }
      out[y * w + x] = sum / n;
    }
  }
  return out;
}

function hammingHex(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    n += Number(x & 1n);
    x >>= 1n;
  }
  return n;
}

function stockCorpus(): string[] {
  // Filter built-ins too: an invalid entry must degrade the dedup, never
  // crash a verify (hammingHex parses hex).
  const extra = (Deno.env.get("STOCK_IMAGE_HASHES") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[0-9a-f]{16}$/.test(s));
  return [...PLACEHOLDER_DHASHES, ...extra].filter((s) => /^[0-9a-f]{16}$/.test(s));
}

function matchesStockCorpus(hash: string): boolean {
  return stockCorpus().some((h) => hammingHex(hash, h) <= STOCK_HAMMING_THRESHOLD);
}

// =============================================================================
// Provenance — is this candidate tied to THIS specific listing?
// =============================================================================

function parseUrlOrNull(raw: string | undefined | null): URL | null {
  if (!raw) return null;
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

/** Extract a registrable-ish hostname from a URL, bare domain, or null. */
function domainOf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let candidate = raw.trim();
  if (!candidate) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
    // A bare word without a dot is a company name, not a domain.
    if (!host.includes(".") && !/^[0-9a-f:]+$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

function hostTiesTo(host: string, referenceDomain: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  const r = referenceDomain.toLowerCase().replace(/^www\./, "");
  return h === r || h.endsWith(`.${r}`);
}

function companyNameTies(host: string, name: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = normalize(host);
  const n = normalize(name);
  // Minimum length keeps short common words ("Green") from tying unrelated
  // domains; the vision gate still ANDs on top.
  return n.length >= 6 && domain.includes(n);
}

function presenceUrlTies(sourceUrl: URL, presenceRaw: string): boolean {
  const presence = parseUrlOrNull(presenceRaw);
  if (!presence) return false;
  const pHost = presence.hostname.toLowerCase().replace(/^www\./, "");
  const sHost = sourceUrl.hostname.toLowerCase().replace(/^www\./, "");
  const sameHost = sHost === pHost || sHost.endsWith(`.${pHost}`) ||
    pHost.endsWith(`.${sHost}`);
  if (!sameHost) return false;
  // When the presence URL carries a page path, the source must be on that
  // page (or under it) — any photo from the same social network would
  // otherwise tie by host alone.
  const pPath = presence.pathname.replace(/\/+$/, "");
  if (!pPath || pPath === "/") return true;
  const sPath = sourceUrl.pathname.replace(/\/+$/, "");
  return sPath === pPath || sPath.startsWith(`${pPath}/`);
}

function domainTie(
  sourceDomain: string,
  reference: string | undefined,
  basis: ProvenanceBasis,
): ProvenanceVerdict | null {
  if (!reference?.trim()) return null;
  const refDomain = domainOf(reference.trim());
  if (refDomain) {
    if (hostTiesTo(sourceDomain, refDomain)) {
      return { tie: true, basis, source_domain: sourceDomain };
    }
    return null;
  }
  if (basis === "host_company" && companyNameTies(sourceDomain, reference.trim())) {
    return { tie: true, basis, source_domain: sourceDomain };
  }
  return null;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** EXIF GPS coordinates from the fetched bytes, or null when absent. */
function exifGpsCoordinates(
  bytes: Uint8Array,
): { lat: number; lng: number } | null {
  try {
    // exifreader 4.x: load() returns the tags object directly (no { tags }),
    // and its bundled DataView polyfill requires a node Buffer — a plain
    // Uint8Array throws inside load(). Tag names are 4.x style ("GPSLatitude").
    const tags = ExifReader.load(Buffer.from(bytes)) as Record<
      string,
      { value?: unknown }
    >;
    const lat = toDecimalGps(tags.GPSLatitude?.value, tags.GPSLatitudeRef?.value);
    const lng = toDecimalGps(tags.GPSLongitude?.value, tags.GPSLongitudeRef?.value);
    if (lat === null || lng === null) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    // Missing or unreadable EXIF is not a negative signal.
    return null;
  }
}

function rationalToNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (Array.isArray(v)) {
    // exifreader 4.x RATIONAL: [num, den]
    const [num, den] = v as [unknown, unknown];
    if (typeof num !== "number" || typeof den !== "number") {
      throw new Error("not a rational");
    }
    if (!den) throw new Error("zero denominator");
    return num / den;
  }
  if (v && typeof v === "object") {
    const obj = v as { value?: unknown; num?: unknown; den?: unknown };
    if (Array.isArray(obj.value)) {
      const [num, den] = obj.value as [number, number];
      if (!den) throw new Error("zero denominator");
      return num / den;
    }
    if (typeof obj.num === "number" && typeof obj.den === "number") {
      if (!obj.den) throw new Error("zero denominator");
      return obj.num / obj.den;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function toDecimalGps(value: unknown, ref: unknown): number | null {
  if (value == null) return null;
  const arr = Array.isArray(value) ? value : [value];
  if (arr.length < 3) return null;
  let deg: number;
  let min: number;
  let sec: number;
  try {
    deg = rationalToNumber(arr[0]);
    min = rationalToNumber(arr[1]);
    sec = rationalToNumber(arr[2]);
  } catch {
    return null;
  }
  if (![deg, min, sec].every((n) => Number.isFinite(n))) return null;
  let decimal = deg + min / 60 + sec / 3600;
  const r = String(ref ?? "").toUpperCase();
  if (r.startsWith("S") || r.startsWith("W")) decimal = -decimal;
  return decimal;
}

function evaluateProvenance(
  input: ImageVerifyInput,
  signageMatchesName: boolean,
  gps: { lat: number; lng: number } | null,
): ProvenanceVerdict {
  const sourceUrl = parseUrlOrNull(input.source_url);
  const sourceDomain = sourceUrl
    ? sourceUrl.hostname.toLowerCase().replace(/^www\./, "")
    : domainOf(input.source_domain);

  const noTie: ProvenanceVerdict = {
    tie: false,
    basis: "none",
    source_domain: sourceDomain,
  };
  if (!sourceDomain) return exifGpsTie(input, gps, noTie);

  const tie = domainTie(sourceDomain, input.listing_website, "listing_website") ??
    domainTie(sourceDomain, input.host_company, "host_company");
  if (tie) return tie;

  const presence = input.own_presence_urls
    ?.map((u) =>
      sourceUrl && presenceUrlTies(sourceUrl, u)
        ? { tie: true, basis: "own_presence" as const, source_domain: sourceDomain }
        : null
    )
    .find(Boolean);
  if (presence) return presence;

  if (
    MAPS_SOCIAL_DOMAINS.some((d) => hostTiesTo(sourceDomain, d)) &&
    signageMatchesName
  ) {
    return { tie: true, basis: "maps_social_signage", source_domain: sourceDomain };
  }

  return exifGpsTie(input, gps, noTie);
}

function exifGpsTie(
  input: ImageVerifyInput,
  gps: { lat: number; lng: number } | null,
  noTie: ProvenanceVerdict,
): ProvenanceVerdict {
  if (
    gps && input.listing_lat != null && input.listing_lng != null &&
    haversineMeters(gps.lat, gps.lng, input.listing_lat, input.listing_lng) <=
      EXIF_GPS_TIE_RADIUS_M
  ) {
    return { tie: true, basis: "exif_gps", source_domain: noTie.source_domain };
  }
  return noTie;
}

// =============================================================================
// SSRF-gated image fetch (bytes in, pinned to the validated address)
// =============================================================================

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked: a 10MB spread into String.fromCharCode would overflow the stack.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function detectImageFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "jpeg";
  if (
    bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 &&
    bytes[2] === 0x4e && bytes[3] === 0x47
  ) return "png";
  if (
    bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 &&
    bytes[2] === 0x46 && bytes[3] === 0x46
  ) return "webp";
  return null;
}

/**
 * Fetch an image through the SSRF gate: static validation, DNS resolution
 * with every resolved address checked public, then a fetch pinned to the
 * validated IP (no re-resolution, no redirect following). The validated
 * address is the address that is contacted — the rebinding window is closed
 * because the connection never re-resolves.
 */
async function fetchVerifiedImage(
  url: string,
): Promise<{ bytes: Uint8Array; format: "jpeg" | "png" | "webp" }> {
  const validation = await resolveAndValidateUrl(url, { allowHttp: true });
  if (!validation.valid) {
    throw new ValidationError(`Image URL rejected: ${validation.reason}`);
  }
  if (!validation.resolvedIps?.length || !validation.pinnedUrl) {
    throw new ServerError("Image host did not resolve to a public address");
  }
  let resp: Response;
  try {
    // ORIGINAL url for SNI/cert + Host (fetchPinned arg-1 contract); the
    // validated IP pins the connection (arg 2 — no DNS inside the fetch).
    // Passing the IP-literal pinnedUrl here would set SNI=IP and fail
    // certificate validation on https hosts.
    resp = await fetchPinned(url, validation.resolvedIps[0], {
      timeout: 20_000,
    });
  } catch (err) {
    throw new ServerError(`Image fetch failed: ${String(err).slice(0, 120)}`);
  }
  if (resp.status !== 200) {
    throw new ServerError(`Image fetch returned HTTP ${resp.status}`);
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ServerError("Image exceeds the 10MB verification limit");
  }
  const format = detectImageFormat(bytes);
  if (!format) {
    throw new ServerError("Fetched bytes are not a recognizable image");
  }
  return { bytes, format };
}

/** FNV-1a 64-bit over a string — deterministic cache-key digest without a
 *  crypto API dependency (the estate's declared Deno surface has none). */
function fnv1a64(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

/** Test/ops seam, mirroring ImageSearchDeps in image-search.ts: production
 *  calls use the real SSRF-gated fetch; tests inject fixture bytes. */
export interface ImageVerifyDeps {
  fetchImage?: (
    url: string,
  ) => Promise<{ bytes: Uint8Array; format: "jpeg" | "png" | "webp" }>;
}

export async function imageVerify(
  input: ImageVerifyInput,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  deps: ImageVerifyDeps = {},
): Promise<ImageVerifyResult> {
  if (!input.image_url?.trim()) throw new ValidationError("image_url is required");
  if (!input.listing_name?.trim()) throw new ValidationError("listing_name is required");

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!openaiKey && !geminiKey) {
    throw new ServerError("Missing OPENAI_API_KEY or GEMINI_API_KEY for image verification");
  }

  // Cache — the key covers the image AND the listing provenance inputs, so a
  // verdict for one listing can never be inherited by another.
  // The estate's generateCacheKey truncates base64 to 64 chars (~48 JSON
  // bytes); with this long input the cut lands inside the image URL and the
  // provenance params (serialized after "inputs") never enter the key — two
  // listings on the same host would share a verdict. Digest the full
  // provenance envelope instead (cache key, not a security boundary).
  const cacheKey = "vfy-" + fnv1a64(JSON.stringify({
    url: input.image_url,
    name: input.listing_name,
    type: input.post_type,
    s: input.source_url,
    sd: input.source_domain,
    lw: input.listing_website,
    hc: input.host_company,
    op: input.own_presence_urls,
    lat: input.listing_lat,
    lng: input.listing_lng,
  }));
  const cached = await getCachedResult(cacheKey, supabase);
  if (cached) return cached.result as ImageVerifyResult;

  // 1. Fetch the image bytes through the SSRF gate — before any vision quota
  //    is spent. The same bytes serve the dHash dedup, the EXIF signal, and
  //    the Gemini inline_data. (Close criterion (d): the provider receives
  //    bytes we fetched, not a URL it is asked to trust.)
  const doFetchImage = deps.fetchImage ?? fetchVerifiedImage;
  const { bytes, format } = await doFetchImage(input.image_url.trim());
  if (bytes.byteLength < MIN_IMAGE_BYTES) {
    const small: ImageVerifyResult = {
      pass: false,
      score: 0,
      description: `Image is ${(bytes.byteLength / 1024).toFixed(1)}KB — below the ` +
        `${MIN_IMAGE_BYTES / 1024}KB floor; not verifiable as a photograph.`,
      is_real_photo: false,
      matches_listing: false,
      model: "size-guard",
      provenance: {
        tie: false,
        basis: "none",
        source_domain: domainOf(input.source_domain ?? input.source_url),
      },
    };
    await setCachedResult(cacheKey, small, supabase);
    return small;
  }

  // 2. Stock/placeholder dedup — a HARD reject before any vision spend. A
  //    dHash within threshold of a known estate placeholder means the bytes
  //    are not a photograph of this location, whatever the vision model
  //    would have said. (Architect addendum.)
  const dhash = await perceptualHashHex(bytes);
  if (dhash !== null && matchesStockCorpus(dhash)) {
    const stockResult: ImageVerifyResult = {
      pass: false,
      score: 0,
      description: `Rejected by perceptual-hash stock/placeholder dedup before vision: ` +
        `dHash ${dhash} is within ${STOCK_HAMMING_THRESHOLD} bits of a known ` +
        "estate placeholder asset.",
      is_real_photo: false,
      matches_listing: false,
      model: "stock-dedup",
      provenance: {
        tie: false,
        basis: "none",
        source_domain: domainOf(input.source_domain ?? input.source_url),
      },
      perceptual_hash: dhash,
      stock_rejected: true,
    };
    await setCachedResult(cacheKey, stockResult, supabase);
    logger.info("imageVerify: stock/placeholder dedup reject", {
      url: input.image_url.slice(0, 80),
      name: input.listing_name.slice(0, 60),
      dhash,
    });
    return stockResult;
  }

  // 3. Vision (OpenAI first, Gemini fallback).
  const prompt = VERIFY_PROMPT
    .replace("{name}", input.listing_name.slice(0, 200))
    .replace("{type}", input.post_type === "fridge" ? "community fridge" : "food bank")
    .replace("{address}", (input.listing_address || "unknown").slice(0, 200));

  let answers: VisionAnswers;
  let model: string;
  if (openaiKey) {
    try {
      answers = await verifyWithOpenAI(input.image_url.trim(), prompt, openaiKey);
      model = "gpt-4o";
    } catch (err) {
      if (!geminiKey) throw err;
      logger.warn("imageVerify: OpenAI failed, falling back to Gemini", {
        error: String(err).slice(0, 200),
      });
      answers = await verifyWithGemini(bytes, format, prompt, geminiKey);
      model = geminiVisionModel();
    }
  } else {
    if (!geminiKey) throw new ServerError("imageVerify: no vision key configured");
    answers = await verifyWithGemini(bytes, format, prompt, geminiKey);
    model = geminiVisionModel();
  }

  // 4. Provenance — the candidate must tie to THIS specific listing. A real
  //    photo of a different, merely similar facility fails here even with a
  //    perfect vision score. (Close criteria (a) + (b).)
  const provenance = evaluateProvenance(
    input,
    answers.signage_matches_name,
    exifGpsCoordinates(bytes),
  );
  const matchesListing = answers.matches_listing && provenance.tie;
  const result: ImageVerifyResult = {
    pass: answers.score > 0.7 && answers.is_real_photo && matchesListing,
    score: answers.score,
    description: answers.description,
    is_real_photo: answers.is_real_photo,
    matches_listing: matchesListing,
    model,
    provenance,
    ...(dhash !== null ? { perceptual_hash: dhash } : {}),
  };

  // 5. Cache for 7 days (verification is stable for a given image+listing).
  await setCachedResult(cacheKey, result, supabase);

  logger.info("imageVerify complete", {
    url: input.image_url.slice(0, 80),
    pass: result.pass,
    score: result.score,
    model,
    provenanceBasis: provenance.basis,
  });
  return result;
}

interface VisionAnswers {
  is_real_photo: boolean;
  matches_listing: boolean;
  signage_matches_name: boolean;
  is_outdoor_physical: boolean;
  score: number;
  description: string;
}

function parseVisionAnswers(raw: string): VisionAnswers {
  const cleaned = raw.trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ServerError("Vision model returned unparseable JSON");
  }
  const score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
  return {
    is_real_photo: parsed.is_real_photo === true,
    matches_listing: parsed.matches_listing === true,
    signage_matches_name: parsed.signage_matches_name === true,
    is_outdoor_physical: parsed.is_outdoor_physical === true,
    score,
    description: String(parsed.description ?? "").slice(0, 300),
  };
}

async function verifyWithOpenAI(
  imageUrl: string,
  prompt: string,
  apiKey: string,
): Promise<VisionAnswers> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
        ],
      }],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ServerError(`OpenAI vision error ${resp.status}: ${text.slice(0, 150)}`);
  }

  const data = await resp.json();
  const content = String(data.choices?.[0]?.message?.content ?? "{}");
  return parseVisionAnswers(content);
}

const geminiVisionModel = (): string => Deno.env.get("GEMINI_VISION_MODEL") || "gemini-1.5-flash";

async function verifyWithGemini(
  bytes: Uint8Array,
  format: "jpeg" | "png" | "webp",
  prompt: string,
  apiKey: string,
): Promise<VisionAnswers> {
  const model = geminiVisionModel();
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            // The actually-fetched bytes (base64). Gemini cannot fetch a URL
            // from a text part, and an empty inline_data verifies nothing —
            // it hallucinates a pass. (Close criterion (d).)
            { inline_data: { mime_type: mime, data: bytesToBase64(bytes) } },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new ServerError(`Gemini vision error ${resp.status}: ${text.slice(0, 150)}`);
  }

  const data = await resp.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  return parseVisionAnswers(text);
}

// =============================================================================
// a1 Scrape — own-presence website scrape (PRIMARY tier, no external source)
// =============================================================================

/** The SSRF-gated own-site HTML fetch (production default). Returns null on
 *  a non-200. The caller has already validated the URL + resolved IPs. */
async function fetchOwnSiteHtml(
  websiteUrl: string,
  validatedIp: string,
): Promise<string | null> {
  const resp = await fetchPinned(websiteUrl, validatedIp, {
    timeout: 15_000,
    headers: {
      "User-Agent": "FoodShare/1.0 (image-enrichment; +https://foodshare.club)",
      "Accept": "text/html",
    },
  });
  if (!resp.ok) return null;
  return await resp.text();
}

/**
 * Scrape the listing's own website for images. This is the a1 tier:
 * it only uses images from the listing's own domain (provenance: own-presence).
 *
 * Routes through resolveAndValidateUrl (SSRF-safe). No external search.
 *
 * @returns candidate image URLs from the own domain, or empty array.
 */
export async function a1Scrape(
  websiteUrl: string,
  deps: { fetchHtml?: (url: string, validatedIp: string) => Promise<string | null> } = {},
): Promise<ImageCandidate[]> {
  // SSRF-safe: resolve + validate before fetching
  const validation = await resolveAndValidateUrl(websiteUrl, { allowHttp: true });
  if (!validation.valid) {
    logger.info("a1Scrape: URL rejected", {
      url: websiteUrl.slice(0, 80),
      reason: validation.reason,
    });
    return [];
  }
  // Fail-closed: if no validated IP, refuse — never fall back to the unpinned URL
  // (that would re-resolve the hostname and reopen the rebind window).
  if (!validation.resolvedIps || validation.resolvedIps.length === 0) {
    logger.info("a1Scrape: no validated IP, fail-closed");
    return [];
  }

  // Resolve-pinned fetch: ORIGINAL url (SNI/cert + Host use the real hostname),
  // DNS pinned to the validated IP. redirect:error, no cert disabling.
  let html: string | null;
  try {
    html = await (deps?.fetchHtml ?? fetchOwnSiteHtml)(websiteUrl, validation.resolvedIps[0]);
  } catch (err) {
    logger.info("a1Scrape: fetch error", { error: String(err).slice(0, 80) });
    return [];
  }
  if (html === null) {
    logger.info("a1Scrape: fetch failed");
    return [];
  }

  if (html.length > 2_000_000) {
    // Cap: don't process giant pages
    html = html.slice(0, 2_000_000);
  }

  // Extract image URLs: og:image, twitter:image, <img> tags
  const imageUrls: string[] = [];

  // og:image (highest priority — the site's own chosen image)
  const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (ogMatch) imageUrls.push(ogMatch[1]);

  // twitter:image
  const twMatch = html.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (twMatch) imageUrls.push(twMatch[1]);

  // <img> tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imageUrls.push(imgMatch[1]);
  }

  // Resolve relative URLs against the website origin
  const origin = new URL(websiteUrl).origin;
  const ownDomain = new URL(websiteUrl).hostname;

  const candidates: ImageCandidate[] = [];
  for (const raw of imageUrls) {
    if (!raw) continue;
    // Skip data URIs, non-image protocols
    if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("javascript:")) {
      continue;
    }
    // Resolve relative URLs
    let resolved: string;
    try {
      resolved = new URL(raw, origin).toString();
    } catch {
      continue;
    }
    let resolvedHost: string;
    try {
      resolvedHost = new URL(resolved).hostname;
    } catch {
      continue;
    }
    // PROVENANCE: a1 = own domain only. www/ non-www variants of the same
    // host are the same presence — the site's own og:image must not be
    // excluded by a label difference.
    const normHost = (h: string) => h.replace(/^www\./, "").toLowerCase();
    if (normHost(resolvedHost) !== normHost(ownDomain)) continue;
    // Skip obvious non-photos (logos, icons, avatars)
    if (/logo|icon|avatar|sprite|banner|flag|badge/i.test(resolved)) continue;
    candidates.push({ url: resolved, source: "a1-own-domain" });
    if (candidates.length >= 5) break; // cap
  }

  logger.info("a1Scrape complete", { domain: ownDomain, found: candidates.length });
  return candidates;
}

// =============================================================================
// enrichListing — Full pipeline orchestrator: a1 scrape → (a2 SERP) → place
// =============================================================================

export interface EnrichListingInput {
  post_id: number;
}

/** Test/ops seams, mirroring ImageSearchDeps / ImageVerifyDeps: production
 *  calls use the SSRF-gated fetches; tests inject fixtures. */
export interface EnrichListingDeps {
  fetchImage?: (
    url: string,
  ) => Promise<{ bytes: Uint8Array; format: "jpeg" | "png" | "webp" }>;
  fetchHtml?: (url: string, validatedIp: string) => Promise<string | null>;
  /** Step-5 storage-bytes fetch (default: the SSRF-gated pinned fetch). */
  fetchBytes?: (
    url: string,
  ) => Promise<{ bytes: Uint8Array; contentType: string } | { error: string }>;
}

export interface EnrichListingResult {
  status: "placed" | "fell_through" | "skipped" | "failed";
  post_id: number;
  image_url?: string;
  provenance?: Record<string, unknown>;
  error?: string;
  attempts: number;
}

/** Step-5 fetch (production): SSRF gate + pinned fetch + content-type and
 *  size floors. Returns the bytes, or the fail-closed reason. */
async function fetchVerifiedImageBytes(
  url: string,
): Promise<{ bytes: Uint8Array; contentType: string } | { error: string }> {
  let validation;
  try {
    validation = await resolveAndValidateUrl(url, { allowHttp: true });
  } catch (err) {
    return { error: String(err).slice(0, 100) };
  }
  if (!validation.valid) return { error: `URL rejected (${validation.reason})` };
  // Fail-closed: no validated IP → refuse (never fall back to the unpinned
  // URL, which would re-resolve the hostname and reopen the rebind window).
  if (!validation.resolvedIps || validation.resolvedIps.length === 0) {
    return { error: "no validated IP (fail-closed)" };
  }
  let resp: Response;
  try {
    // Resolve-pinned fetch: ORIGINAL url (SNI/cert + Host correct), DNS pinned.
    resp = await fetchPinned(url, validation.resolvedIps[0], { timeout: 20_000 });
  } catch (err) {
    return { error: String(err).slice(0, 100) };
  }
  if (!resp.ok) return { error: `HTTP ${resp.status}` };
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return { error: `not an image (${contentType})` };
  }
  const buf = await resp.arrayBuffer();
  if (buf.byteLength < 5_000) return { error: "image too small" };
  return { bytes: new Uint8Array(buf), contentType };
}

export async function enrichListing(
  input: EnrichListingInput,
  // deno-lint-ignore no-explicit-any
  supabase: any,
  deps: EnrichListingDeps = {},
): Promise<EnrichListingResult> {
  const postId = input.post_id;
  const attempts: Record<string, string> = {};

  // 1. Read the listing
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select(
      "id, profile_id, post_name, post_description, post_address, post_type, fridge_id, website, metadata, images",
    )
    .eq("id", postId)
    .single();

  if (postErr || !post) {
    return {
      status: "failed",
      post_id: postId,
      error: postErr?.message || "Post not found",
      attempts: 0,
    };
  }

  const postType = post.post_type || "food";
  const name = post.post_name || "";
  const address = post.post_address || undefined;
  // posts has no city/state columns — the host listing carries them, plus the
  // coordinates the EXIF-GPS provenance signal needs.
  let city: string | undefined;
  let state: string | undefined;
  let hostCompany: string | undefined;
  let listingLat: number | undefined;
  let listingLng: number | undefined;
  if (post.fridge_id) {
    const { data: fridge } = await supabase
      .from("community_fridges")
      .select("city, state, host_company, latitude, longitude")
      .eq("id", post.fridge_id)
      .maybeSingle();
    city = fridge?.city ?? undefined;
    state = fridge?.state ?? undefined;
    hostCompany = fridge?.host_company ?? undefined;
    listingLat = fridge?.latitude ?? undefined;
    listingLng = fridge?.longitude ?? undefined;
  }

  // 2. Idempotency: skip if already placed with usable image URLs
  const hasUsableImages = Array.isArray(post.images) &&
    post.images.length > 0 &&
    post.images.some((img: unknown) =>
      typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))
    );

  const provenance = post.metadata?.image_provenance;
  if (hasUsableImages && provenance?.status === "placed") {
    return {
      status: "skipped",
      post_id: postId,
      image_url: post.images?.[0],
      provenance,
      attempts: 0,
    };
  }

  // 2.5 Ingest user-uploaded photo from Telegram if present (preserves authentic user photos)
  const rawImages = Array.isArray(post.images) ? post.images : [];
  const telegramFileId = rawImages.find((img: unknown) =>
    typeof img === "string" && img.startsWith("AgAC") && img.length > 20
  );

  if (telegramFileId && Deno.env.get("TELEGRAM_BOT_TOKEN")) {
    try {
      const { downloadAndUploadTelegramFile } = await import(
        "../../../telegram-bot-foodshare/services/telegram-files.ts"
      );
      const uploadedUrl = await downloadAndUploadTelegramFile(telegramFileId as string, 0);
      if (uploadedUrl) {
        const now = new Date().toISOString();
        const newMetadata = {
          ...(post.metadata || {}),
          image_provenance: {
            source_url: uploadedUrl,
            source: "telegram-user-upload",
            verify_score: 1.0,
            verify_model: "telegram-file-ingest",
            crawled_at: now,
            placed_at: now,
            status: "placed",
            query_type: postType,
          },
        };
        const { error: updateErr } = await supabase
          .from("posts")
          .update({ images: [uploadedUrl], metadata: newMetadata })
          .eq("id", postId);

        if (!updateErr) {
          logger.info("enrichListing: recovered authentic user photo from Telegram", {
            post_id: postId,
            image: uploadedUrl,
          });
          return {
            status: "placed",
            post_id: postId,
            image_url: uploadedUrl,
            provenance: newMetadata.image_provenance,
            attempts: 1,
          };
        }
      }
    } catch (err) {
      logger.warn("Telegram photo recovery failed, proceeding to cover search", {
        post_id: postId,
        error: String(err),
      });
    }
  }

  // 3. A1/A2 tier: scrape website or SERP for fridge/foodbank
  let candidates: ImageCandidate[] = [];
  let source = "a1-own-domain";
  const website = (post.website && post.website !== "-" && post.website.trim() !== "")
    ? post.website.trim()
    : null;

  if (postType === "fridge" || postType === "foodbank") {
    if (website) {
      try {
        candidates = await a1Scrape(website, { fetchHtml: deps.fetchHtml });
        attempts.a1 = `scraped ${
          website.slice(0, 40)
        } → ${candidates.length} own-domain candidates`;
      } catch (err) {
        attempts.a1 = `error: ${String(err).slice(0, 80)}`;
      }
    } else {
      attempts.a1 = "no website on listing";
    }

    // 4. A2 tier (FALLBACK, operator-gated): SERP external search
    if (candidates.length === 0) {
      const allowSerp = Deno.env.get("ALLOW_SERP_FALLBACK") === "true";
      if (allowSerp) {
        source = "a2-serp";
        try {
          const searchResult = await imageSearch({
            name,
            city,
            state,
            post_type: postType as "fridge" | "foodbank",
            max_results: 10,
          }, supabase);
          candidates = searchResult.candidates;
          attempts.a2 = `serp found ${candidates.length}`;
        } catch (err) {
          attempts.a2 = `error: ${String(err).slice(0, 80)}`;
        }
      } else {
        attempts.a2 = "gated (ALLOW_SERP_FALLBACK not set)";
      }
    }

    if (candidates.length === 0) {
      return {
        status: "fell_through",
        post_id: postId,
        error: website
          ? "no usable own-domain image (a1 exhausted; a2 gated)"
          : "no website + a2 gated — covers-wave floor handles",
        attempts: 0,
      };
    }

    // 4. Verify candidate images if any found
    let verifiedUrl: string | null = null;
    let verifyResult: ImageVerifyResult | null = null;
    let verifyAttempts = 0;
    const maxVerify = Math.min(candidates.length, 5);

    for (const candidate of candidates.slice(0, maxVerify)) {
      verifyAttempts++;
      try {
        const result = await imageVerify(
          {
            image_url: candidate.url,
            listing_name: name,
            listing_address: address,
            post_type: postType as "fridge" | "foodbank",
            source_url: candidate.url,
            source_domain: domainOf(candidate.url) ?? undefined,
            listing_website: website ?? undefined,
            host_company: hostCompany,
            listing_lat: listingLat,
            listing_lng: listingLng,
          },
          supabase,
          { fetchImage: deps.fetchImage },
        );
        attempts[`verify_${verifyAttempts}`] =
          `score=${result.score} pass=${result.pass} basis=${result.provenance.basis}`;
        if (result.pass) {
          verifiedUrl = candidate.url;
          verifyResult = result;
          break;
        }
      } catch (err) {
        attempts[`verify_${verifyAttempts}`] = `error: ${String(err).slice(0, 80)}`;
      }
    }

    if (!verifiedUrl || !verifyResult) {
      return {
        status: "fell_through",
        post_id: postId,
        error: "no candidate passed verification",
        attempts: verifyAttempts,
      };
    }

    // 5. Fetch — SSRF-safe: resolve + validate, then pinned fetch.
    const stage = await (deps.fetchBytes ?? fetchVerifiedImageBytes)(verifiedUrl);
    if ("error" in stage) {
      return {
        status: "fell_through",
        post_id: postId,
        error: `fetch: ${stage.error}`,
        attempts: verifyAttempts,
      };
    }

    const imageData: Uint8Array = stage.bytes;
    const contentType = stage.contentType;
    attempts.fetch = `${(imageData.byteLength / 1024).toFixed(1)}KB ${contentType}`;

    // 6. Place — upload to storage + update DB
    const safeName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 50) ||
      `post-${postId}`;
    const storagePath = `fridge-foodbank/${postId}-${safeName}.jpg`;
    const now = new Date().toISOString();

    try {
      // Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("posts")
        .upload(storagePath, new Blob([imageData.buffer as ArrayBuffer], { type: contentType }), {
          contentType,
          upsert: true,
        });
      if (uploadErr) throw new Error(uploadErr.message);

      // Get the public URL
      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(storagePath);
      const imageUrl = urlData.publicUrl;

      // Update the post: set images[0] + provenance
      const existingImages = post.images && post.images.length > 0 ? post.images : [];
      const newImages = [imageUrl, ...existingImages.slice(0, 2)]; // keep max 3
      const newMetadata = {
        ...(post.metadata || {}),
        image_provenance: {
          source_url: verifiedUrl,
          source_domain: verifyResult.provenance.source_domain,
          signal_basis: verifyResult.provenance.basis,
          source, // "a1-own-domain" | "a2-serp"
          verify_score: verifyResult.score,
          verify_model: verifyResult.model,
          verify_description: verifyResult.description,
          ...(verifyResult.perceptual_hash
            ? { perceptual_hash: verifyResult.perceptual_hash }
            : {}),
          crawled_at: now,
          placed_at: now,
          status: "placed",
          query_type: postType,
        },
      };

      const { error: updateErr } = await supabase
        .from("posts")
        .update({ images: newImages, metadata: newMetadata })
        .eq("id", postId);
      if (updateErr) throw new Error(updateErr.message);

      attempts.place = `storage+db ok`;
      logger.info("enrichListing: placed", {
        post_id: postId,
        image: imageUrl.slice(0, 80),
        score: verifyResult.score,
        model: verifyResult.model,
      });

      return {
        status: "placed",
        post_id: postId,
        image_url: imageUrl,
        provenance: newMetadata.image_provenance,
        attempts: verifyAttempts,
      };
    } catch (err) {
      attempts.place = `error: ${String(err).slice(0, 100)}`;
      return {
        status: "fell_through",
        post_id: postId,
        error: `place: ${String(err).slice(0, 100)}`,
        attempts: verifyAttempts,
      };
    }
  }

  // 7. Universal AI reference cover tier: for community listings (food, borrow, things, etc.)
  try {
    const coverResult = await createListingCover(
      {
        title: post.post_name || "Community Food",
        description: post.post_description || undefined,
        postType: post.post_type || "food",
        images: [],
      },
      post.profile_id || "system",
      supabase,
      `enrich-${postId}`,
      { quota: () => Promise.resolve(true) },
    );

    if (coverResult.images && coverResult.images.length > 0) {
      const imageUrl = coverResult.images[0];
      const now = new Date().toISOString();
      const newMetadata = {
        ...(post.metadata || {}),
        cover: coverResult.cover,
        image_provenance: {
          source_url: coverResult.cover?.sourceImageUrl || imageUrl,
          source: coverResult.cover?.provider || "commons-search-v1",
          verify_score: coverResult.cover?.confidence ??
            (coverResult.cover?.kind === "generated" ? 0 : 1.0),
          verify_model: coverResult.cover?.model || "commons-search-v1",
          crawled_at: now,
          placed_at: now,
          status: "placed",
          query_type: post.post_type || "food",
        },
      };

      const { error: updateErr } = await supabase
        .from("posts")
        .update({ images: [imageUrl], metadata: newMetadata })
        .eq("id", postId);

      if (updateErr) throw new Error(updateErr.message);

      return {
        status: "placed",
        post_id: postId,
        image_url: imageUrl,
        provenance: newMetadata.image_provenance,
        attempts: 1,
      };
    }
  } catch (err) {
    logger.warn("createListingCover fallback failed in enrichListing", {
      postId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    status: "fell_through",
    post_id: postId,
    error: "no usable cover found in Commons reference search",
    attempts: 1,
  };
}
