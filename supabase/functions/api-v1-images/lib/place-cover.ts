/**
 * POST /place-cover — real-photo pipeline orchestrator for fridge/foodbank.
 *
 * Service-authenticated. Orchestrates crawl → verify → fetch → place:
 *   crawl   a1-first, mirroring enrichListing (t_6f548269): scrape the
 *           location's OWN website (a1Scrape — own-domain candidates, no
 *           external source, no consent gate). Only when a1 finds nothing
 *           AND the operator has set ALLOW_SERP_FALLBACK=true does the a2
 *           SERP crawl run (api-v1-ai /inference/imageSearch). A provisioned
 *           key is a capability, not a source decision.
 *   verify  api-v1-ai /inference/imageVerify  (vision gate). Placement requires
 *           the FULL conjunction: pass && is_real_photo && matches_listing &&
 *           score > 0.7. A real-but-wrong-location photo is worse than a
 *           placeholder, so matches_listing is never optional here. When the
 *           amended gate returns a provenance verdict, its tie must also be
 *           true (fail-closed).
 *   fetch   resolved-IP SSRF gate (resolveAndValidateUrl — https only, ANY
 *           non-public resolution rejected) then a rebinding-proof pinned
 *           download (fetchPinned — original URL for SNI/Host/cert, DNS
 *           pinned to the validated IP, no redirects, 10MB cap), raster
 *           magic-byte + 5MB validation, owner-scoped content-addressed
 *           storage, public readback hash verification (same gate).
 *   place   one atomic posts update: images[0] = stored URL plus the full
 *           provenance record under metadata.image_provenance.
 *
 * Idempotent: metadata.image_provenance.status === "placed" skips every stage.
 * A live, non-placeholder, non-ladder cover also skips (stored real photo wins).
 *
 * Fall-through: any pipeline failure lands on the covers-wave ladder
 * (generation → deterministic title-card floor) and records status
 * "fell-through" — NOT "placed" — so a later sweep run retries the real-photo
 * pipeline. The placeholder is a transient floor, never the target end state.
 *
 * Provenance (placed): {status, source_kind: "crawl", source_url,
 * source_domain, domain_tie_basis, signal_basis, verify_provenance,
 * verify_score, verify_model, crawled_at, placed_at}. domain_tie_basis is
 * auditable domain evidence: own-website:<domain> / host-listing-photo:<domain>
 * when the candidate source ties to the location's own presence, otherwise
 * serp-verified:<domain>. signal_basis records which signal established the
 * provenance tie: the amended verify gate's verdict basis (listing_website /
 * host_company / own_presence / maps_social_signage / exif_gps) when present,
 * else "vision-conjunction" (the pre-amendment gate). verify_provenance keeps
 * the full verdict for audit (null when the upstream gate predates it).
 *
 * Timeouts: crawl 20s, verify 25s per candidate (max 5), fetch bounded by
 * fetchPinned (10s), and an 80s pipeline deadline that reserves 20s for
 * fetch+place. The fall-through ladder runs after the deadline with its own
 * bounds (generation 45s, title-card instant).
 */

import type { HandlerContext } from "../../_shared/api-handler.ts";
import { ok } from "../../_shared/api-handler.ts";
import {
  DatabaseError,
  NotFoundError,
  ServerError,
  ValidationError,
} from "../../_shared/errors.ts";
import { logger } from "../../_shared/logger.ts";
import { requireServiceAuth } from "../../_shared/service-auth.ts";
import { STORAGE_BUCKETS } from "../../_shared/storage-constants.ts";
import { fetchPinned, resolveAndValidateUrl, validateUrl } from "../../_shared/url-validation.ts";
import type { Json } from "../../_shared/database.types.ts";
import { a1Scrape } from "../../api-v1-ai/lib/providers/image-pipeline.ts";
import { rasterType } from "../../api-v1-products/lib/listing-cover.ts";
import {
  type CoverEnsureInput,
  type CoverEnsureProvenance,
  type CoverEnsureResult,
  defaultCoverEnsureDependencies,
  ensureCoverLadder,
  probeImageUrl,
} from "./cover-ensure.ts";
import { uploadImage } from "./storage.ts";
import { z } from "zod";

export const placeCoverBodySchema = z.object({
  listingId: z.number().int().positive(),
});

export const CRAWL_TIMEOUT_MS = 20_000;
export const VERIFY_TIMEOUT_MS = 25_000;
export const PIPELINE_DEADLINE_MS = 80_000;
export const MAX_VERIFY_CANDIDATES = 5;
const FETCH_PLACE_RESERVE_MS = 20_000;
const MAX_IMAGES = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // matches image-utils downloadImage cap

// ---------------------------------------------------------------------------
// Stage contracts (api-v1-ai imageSearch / imageVerify)
// ---------------------------------------------------------------------------

export interface PlaceCoverCandidate {
  url: string;
  source?: string;
  title?: string;
}

export interface CrawlInput {
  name: string;
  city?: string;
  state?: string;
  post_type: string;
  /** Own-presence context for the amended own-source-first crawl. */
  website?: string;
  listingId?: number;
}

export interface CrawlResult {
  candidates: PlaceCoverCandidate[];
  query?: string;
}

export interface VerifyInput {
  image_url: string;
  listing_name: string;
  listing_address?: string;
  post_type: string;
  /** Provenance context for the amended subject+provenance verify gate. */
  source_url?: string;
  source_domain?: string;
  listing_website?: string;
  host_company?: string;
  listing_lat?: number;
  listing_lng?: number;
  listingId?: number;
}

/**
 * The amended verify gate's provenance verdict (t_065738e8). Optional so the
 * orchestrator also rides the pre-amendment gate, which returns no verdict.
 */
export type VerifyProvenanceVerdict = {
  tie: boolean;
  basis: string;
  source_domain: string | null;
};

export interface VerifyResult {
  pass: boolean;
  score: number;
  is_real_photo: boolean;
  matches_listing: boolean;
  model: string;
  description?: string;
  provenance?: VerifyProvenanceVerdict;
}

// ---------------------------------------------------------------------------
// Provenance records
// ---------------------------------------------------------------------------

export type PlacedProvenance = {
  status: "placed";
  source_kind: "crawl";
  source_url: string;
  source_domain: string;
  domain_tie_basis: string;
  signal_basis: string;
  verify_provenance: VerifyProvenanceVerdict | null;
  verify_score: number;
  verify_model: string;
  crawled_at: string;
  placed_at: string;
};

export type FellThroughProvenance = {
  status: "fell-through";
  /** Floor origin: tier-2 generation vs the deterministic title-card floor. */
  source_kind: "generate" | "placeholder-title-card";
  tier: 2 | 3;
  cover: CoverEnsureProvenance | null;
  reason: string;
  attempted_at: string;
};

export type ImageProvenance = PlacedProvenance | FellThroughProvenance;

export interface PlaceCoverListing {
  id: number;
  profile_id: string;
  post_name: string;
  post_description: string;
  post_type: string;
  images: string[];
  metadata: Json | null;
  website: string;
  post_address: string;
  city?: string;
  state?: string;
  hostPhotoUrl?: string;
  hostCompany?: string;
  latitude?: number;
  longitude?: number;
}

export type PlaceCoverOutcome =
  | {
    status: "placed";
    url: string;
    images: string[];
    provenance: PlacedProvenance;
    candidatesTried: number;
  }
  | {
    status: "fell-through";
    url: string;
    images: string[];
    tier: 2 | 3;
    cover: CoverEnsureProvenance | null;
    reason: string;
    candidatesTried: number;
  };

export interface PlaceCoverDependencies {
  crawl(input: CrawlInput): Promise<CrawlResult>;
  verify(input: VerifyInput): Promise<VerifyResult>;
  fetchBytes(url: string): Promise<Uint8Array>;
  store(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
  readback(url: string): Promise<Uint8Array>;
  remove(path: string): Promise<void>;
  ladder(input: CoverEnsureInput, ownerId: string): Promise<CoverEnsureResult>;
  isAlive(url: string): Promise<boolean>;
  updateCover(listingId: number, images: string[], metadata: Json): Promise<void>;
  now(): number;
}

// ---------------------------------------------------------------------------
// Guards and helpers
// ---------------------------------------------------------------------------

/** Stored placeholder URLs (the sweep's `images[0] LIKE /placeholder%`). */
export function isPlaceholderLike(url: string): boolean {
  return /placeholder/i.test(url);
}

/** Covers produced by the guarantee ladders — transient floors, upgradeable. */
export function isLadderFloor(url: string): boolean {
  return url.includes("/cover-ensure/") || url.includes("/place-cover/") ||
    url.includes("/reference-covers/");
}

function domainFromHostOrUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return null;
  try {
    return new URL(trimmed).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed)) {
      return trimmed.toLowerCase().replace(/^www\./, "");
    }
    return null;
  }
}

function hostMatches(candidate: string, own: string): boolean {
  return candidate === own || candidate.endsWith(`.${own}`);
}

/** Candidate source domain: SERP `source` when present, else the image URL host. */
export function candidateSourceDomain(candidate: PlaceCoverCandidate): string {
  return domainFromHostOrUrl(candidate.source) ?? domainFromHostOrUrl(candidate.url) ?? "unknown";
}

/** Auditable evidence for how the candidate source ties to this location. */
export function domainTieBasis(candidate: PlaceCoverCandidate, listing: PlaceCoverListing): string {
  const domain = candidateSourceDomain(candidate);
  const own = domainFromHostOrUrl(listing.website);
  if (own !== null && domain !== "unknown" && hostMatches(domain, own)) {
    return `own-website:${own}`;
  }
  const host = domainFromHostOrUrl(listing.hostPhotoUrl);
  if (host !== null && domain !== "unknown" && hostMatches(domain, host)) {
    return `host-listing-photo:${host}`;
  }
  return `serp-verified:${domain}`;
}

/**
 * The placement gate. `pass` alone is not trusted: the conjunction is enforced
 * here so a loose upstream pass can never place a wrong-location photo.
 */
export function verifyGate(result: VerifyResult): boolean {
  // Fail-closed: when the amended gate reports a provenance verdict, a missing
  // tie rejects even if the vision conjunction claims a match.
  if (result.provenance && result.provenance.tie !== true) return false;
  return result.pass === true && result.is_real_photo === true &&
    result.matches_listing === true && result.score > 0.7;
}

/** SSRF pre-filter: https only, no private/internal/metadata targets. */
export function fetchableCandidate(candidate: PlaceCoverCandidate): boolean {
  if (!candidate || typeof candidate.url !== "string" || candidate.url.length === 0) return false;
  return validateUrl(candidate.url, { allowHttp: false }).valid;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function metadataObject(metadata: Json | null): { [key: string]: Json | undefined } {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata;
  return {};
}

function provenanceStatus(metadata: Json | null): string | null {
  const prov = metadataObject(metadata).image_provenance;
  if (prov && typeof prov === "object" && !Array.isArray(prov)) {
    const status = prov.status;
    return typeof status === "string" ? status : null;
  }
  return null;
}

/** Persist images + provenance atomically; clean up the stored object on failure. */
async function persistCover(
  listing: PlaceCoverListing,
  images: string[],
  provenance: ImageProvenance,
  storedPath: string | null,
  deps: PlaceCoverDependencies,
): Promise<void> {
  const metadata: Json = { ...metadataObject(listing.metadata), image_provenance: provenance };
  try {
    await deps.updateCover(listing.id, images, metadata);
  } catch (error) {
    if (storedPath) {
      await deps.remove(storedPath).catch((cleanupError) =>
        logger.warn("place-cover orphan cleanup failed", {
          path: storedPath,
          error: String(cleanupError),
        })
      );
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function placeCoverPipeline(
  listing: PlaceCoverListing,
  deps: PlaceCoverDependencies,
): Promise<PlaceCoverOutcome> {
  const deadline = deps.now() + PIPELINE_DEADLINE_MS;
  const crawledAt = new Date(deps.now()).toISOString();
  const keep = (listing.images ?? []).filter((url) => !isPlaceholderLike(url));
  let candidatesTried = 0;
  let reason = "no-candidates";

  let candidates: PlaceCoverCandidate[] = [];
  try {
    const crawl = await deps.crawl({
      name: listing.post_name,
      city: listing.city,
      state: listing.state,
      post_type: listing.post_type,
      website: domainFromHostOrUrl(listing.website) !== null ? listing.website : undefined,
      listingId: listing.id,
    });
    candidates = (crawl.candidates ?? []).filter(fetchableCandidate).slice(
      0,
      MAX_VERIFY_CANDIDATES,
    );
  } catch (error) {
    logger.warn("place-cover crawl stage failed", { listingId: listing.id, error: String(error) });
    reason = "crawl-failed";
  }

  for (const candidate of candidates) {
    if (deps.now() + FETCH_PLACE_RESERVE_MS >= deadline) {
      reason = "pipeline-timeout";
      break;
    }
    candidatesTried++;
    const sourceDomain = candidateSourceDomain(candidate);

    let verdict: VerifyResult;
    try {
      verdict = await deps.verify({
        image_url: candidate.url,
        listing_name: listing.post_name,
        listing_address: listing.post_address && listing.post_address !== "-"
          ? listing.post_address
          : undefined,
        post_type: listing.post_type,
        source_url: candidate.url,
        source_domain: sourceDomain,
        listing_website: domainFromHostOrUrl(listing.website) !== null
          ? listing.website
          : undefined,
        host_company: listing.hostCompany,
        listing_lat: listing.latitude,
        listing_lng: listing.longitude,
        listingId: listing.id,
      });
    } catch (error) {
      logger.warn("place-cover verify stage failed", {
        listingId: listing.id,
        error: String(error),
      });
      reason = "verify-failed";
      continue;
    }
    if (!verifyGate(verdict)) {
      reason = "no-candidate-verified";
      continue;
    }

    let storedPath: string | null = null;
    let url: string;
    try {
      const bytes = await deps.fetchBytes(candidate.url);
      const format = rasterType(bytes);
      const digest = await sha256Hex(bytes);
      const path = `${listing.profile_id}/place-cover/${digest}.${format}`;
      url = await deps.store(path, bytes, `image/${format}`);
      storedPath = path;
      const readback = await deps.readback(url);
      if ((await sha256Hex(readback)) !== digest) {
        throw new ServerError("place-cover public readback verification failed");
      }
    } catch (error) {
      logger.warn("place-cover fetch stage failed", {
        listingId: listing.id,
        error: String(error),
      });
      if (storedPath) {
        await deps.remove(storedPath).catch((cleanupError) =>
          logger.warn("place-cover orphan cleanup failed", {
            path: storedPath,
            error: String(cleanupError),
          })
        );
      }
      reason = "fetch-failed";
      continue;
    }

    const images = [url, ...keep].slice(0, MAX_IMAGES);
    const provenance: PlacedProvenance = {
      status: "placed",
      source_kind: "crawl",
      source_url: candidate.url,
      source_domain: sourceDomain,
      domain_tie_basis: domainTieBasis(candidate, listing),
      signal_basis: verdict.provenance?.basis ?? "vision-conjunction",
      verify_provenance: verdict.provenance ?? null,
      verify_score: verdict.score,
      verify_model: verdict.model,
      crawled_at: crawledAt,
      placed_at: new Date(deps.now()).toISOString(),
    };
    await persistCover(listing, images, provenance, storedPath, deps);
    return { status: "placed", url, images, provenance, candidatesTried };
  }

  // Fall-through: covers-wave generation → title-card floor. images: [] forces
  // the ladder past its tier-0 keep branch; the floor is always a stored cover.
  const ladder = await deps.ladder(
    {
      title: listing.post_name,
      description: listing.post_description,
      postType: listing.post_type,
      images: [],
    },
    listing.profile_id,
  );
  const tier: 2 | 3 = ladder.tier === 3 ? 3 : 2;
  const images = [ladder.url, ...keep].slice(0, MAX_IMAGES);
  const provenance: FellThroughProvenance = {
    status: "fell-through",
    source_kind: ladder.provenance?.kind === "generated" ? "generate" : "placeholder-title-card",
    tier,
    cover: ladder.provenance,
    reason,
    attempted_at: new Date(deps.now()).toISOString(),
  };
  await persistCover(listing, images, provenance, ladder.storedPath, deps);
  return {
    status: "fell-through",
    url: ladder.url,
    images,
    tier,
    cover: ladder.provenance,
    reason,
    candidatesTried,
  };
}

// ---------------------------------------------------------------------------
// Production wiring
// ---------------------------------------------------------------------------

async function callAiInference<T>(task: string, body: unknown, timeoutMs: number): Promise<T> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) {
    throw new ServerError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  const response = await fetch(`${base}/functions/v1/api-v1-ai/inference/${task}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ServerError(`api-v1-ai ${task} returned ${response.status}: ${text.slice(0, 150)}`);
  }
  const envelope = await response.json();
  if (!envelope || envelope.success !== true || envelope.data == null) {
    throw new ServerError(`api-v1-ai ${task} returned no data`);
  }
  return envelope.data as T;
}

export function defaultPlaceCoverDependencies(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  requestId: string,
): PlaceCoverDependencies {
  const ladderDeps = defaultCoverEnsureDependencies(supabase, requestId);
  // Resolved-IP SSRF gate + rebinding-proof pinned fetch (t_a199d39d):
  // reject ANY non-public resolution, then fetch the ORIGINAL url (correct
  // SNI/Host/cert) with DNS pinned to the validated IP. Redirects rejected.
  const pinnedImageBytes = async (url: string): Promise<Uint8Array> => {
    const validation = await resolveAndValidateUrl(url, { allowHttp: false });
    if (!validation.valid) {
      throw new ValidationError(`Image URL rejected: ${validation.reason}`);
    }
    if (!validation.resolvedIps || validation.resolvedIps.length === 0) {
      throw new ValidationError("Image URL had no validated resolution (fail-closed)");
    }
    const response = await fetchPinned(url, validation.resolvedIps[0], {
      timeout: FETCH_TIMEOUT_MS,
      headers: { "User-Agent": "FoodShare-ImageAPI/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
      throw new Error("Image too large (max 10MB)");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Image too large (max 10MB)");
    }
    return bytes;
  };
  return {
    crawl: async (input) => {
      // A1 (PRIMARY): the location's own web presence — provenance-good by
      // construction, no external source, no consent gate.
      if (input.website) {
        try {
          const own = await a1Scrape(input.website);
          if (own.length > 0) return { candidates: own };
        } catch (error) {
          logger.warn("place-cover a1 scrape failed", {
            listingId: input.listingId,
            error: String(error),
          });
        }
      }
      // A2 (FALLBACK, operator-gated): mirrors enrichListing — SERP runs only
      // on the operator's explicit source word (ALLOW_SERP_FALLBACK=true).
      if (Deno.env.get("ALLOW_SERP_FALLBACK") !== "true") {
        return { candidates: [] };
      }
      return await callAiInference<CrawlResult>("imageSearch", input, CRAWL_TIMEOUT_MS);
    },
    verify: (input) => callAiInference<VerifyResult>("imageVerify", input, VERIFY_TIMEOUT_MS),
    fetchBytes: (url) => pinnedImageBytes(url),
    store: async (path, bytes, contentType) => {
      const stored = await uploadImage(supabase, STORAGE_BUCKETS.POSTS, path, bytes, contentType);
      return stored.publicUrl;
    },
    readback: (url) => pinnedImageBytes(url),
    remove: ladderDeps.remove,
    ladder: (input, ownerId) => ensureCoverLadder(input, ownerId, ladderDeps),
    isAlive: async (url) => {
      // Gate the sibling's raw-fetch probe with the resolved-IP check so a
      // stored (data-plane) URL can never be probed on a non-public host.
      // probeImageUrl's own rebinding window is reported to t_0da73a8c.
      const validation = await resolveAndValidateUrl(url, { allowHttp: false });
      if (!validation.valid) return false;
      return probeImageUrl(url);
    },
    updateCover: async (listingId, images, metadata) => {
      const { error } = await supabase
        .from("posts")
        .update({ images, metadata })
        .eq("id", listingId)
        .select("id")
        .single();
      if (error) throw new DatabaseError(`Failed to persist cover: ${error.message}`);
    },
    now: Date.now,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function handlePlaceCover(
  ctx: HandlerContext,
  deps?: PlaceCoverDependencies,
): Promise<Response> {
  requireServiceAuth(ctx.request);

  const parsed = placeCoverBodySchema.safeParse(ctx.body);
  if (!parsed.success) {
    throw new ValidationError("listingId (positive integer) is required", parsed.error.flatten());
  }
  const { listingId } = parsed.data;
  const requestId = ctx.ctx?.requestId || "";

  const { data: listing, error } = await ctx.supabase
    .from("posts")
    .select(
      "id, profile_id, post_name, post_description, post_type, images, metadata, website, post_address, fridge_id, is_active",
    )
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new DatabaseError(`Failed to load listing: ${error.message}`);
  if (!listing) throw new NotFoundError("Listing", String(listingId));
  if (listing.post_type !== "fridge" && listing.post_type !== "foodbank") {
    throw new ValidationError("place-cover operates on fridge/foodbank listings only");
  }
  if (!listing.is_active) throw new ValidationError("Listing is not active");

  // Idempotency: a placed provenance record skips every stage.
  if (provenanceStatus(listing.metadata) === "placed") {
    return ok({
      status: "skipped",
      reason: "already-placed",
      listingId,
      url: listing.images?.[0] ?? null,
    }, ctx);
  }

  const dependencies = deps ?? defaultPlaceCoverDependencies(ctx.supabase, requestId);
  const images = listing.images ?? [];
  const first = images[0];
  // Tier 1: a stored live real photo wins — never overwrite a user's cover.
  if (
    first && !isPlaceholderLike(first) && !isLadderFloor(first) && await dependencies.isAlive(first)
  ) {
    return ok({ status: "skipped", reason: "live-cover-present", listingId, url: first }, ctx);
  }

  // Best-effort host-listing context (city/state for the crawl, photo host for
  // the provenance tie). fridge_id is a legacy link and often null.
  let city: string | undefined;
  let state: string | undefined;
  let hostPhotoUrl: string | undefined;
  let hostCompany: string | undefined;
  let latitude: number | undefined;
  let longitude: number | undefined;
  if (listing.fridge_id) {
    const { data: fridge, error: fridgeError } = await ctx.supabase
      .from("community_fridges")
      .select("city, state, photo_url, host_company, latitude, longitude")
      .eq("id", listing.fridge_id)
      .maybeSingle();
    if (fridgeError) {
      logger.warn("place-cover host-listing lookup failed", {
        listingId,
        error: fridgeError.message,
      });
    } else if (fridge) {
      city = fridge.city ?? undefined;
      state = fridge.state ?? undefined;
      hostPhotoUrl = fridge.photo_url ?? undefined;
      hostCompany = fridge.host_company ?? undefined;
      latitude = typeof fridge.latitude === "number" ? fridge.latitude : undefined;
      longitude = typeof fridge.longitude === "number" ? fridge.longitude : undefined;
    }
  }

  const outcome = await placeCoverPipeline(
    {
      id: listing.id,
      profile_id: listing.profile_id,
      post_name: listing.post_name,
      post_description: listing.post_description,
      post_type: listing.post_type,
      images,
      metadata: listing.metadata,
      website: listing.website,
      post_address: listing.post_address,
      city,
      state,
      hostPhotoUrl,
      hostCompany,
      latitude,
      longitude,
    },
    dependencies,
  );

  logger.info("place-cover complete", {
    listingId,
    status: outcome.status,
    candidatesTried: outcome.candidatesTried,
    requestId,
  });
  return ok({ listingId, ...outcome }, ctx);
}
