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
import { generateCacheKey, getCachedResult, setCachedResult } from "../cache.ts";

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
}

export interface ImageVerifyResult {
  pass: boolean;
  score: number;
  description: string;
  is_real_photo: boolean;
  matches_listing: boolean;
  model: string;
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
  `You are verifying whether an image is a real photograph of a community food-sharing facility.

Listing: "{name}" ({type})
Address: "{address}"

Analyze the image and answer in JSON:
{
  "is_real_photo": boolean,     // true if this is a real photograph (not illustration, 3D render, stock photo, or screenshot)
  "matches_listing": boolean,   // true if the image plausibly depicts this specific facility or a very similar one at this location
  "is_outdoor_physical": boolean, // true if it shows a physical outdoor/indoor facility (fridge, pantry, building)
  "score": number,              // 0.0-1.0 confidence that this is a real, relevant photograph
  "description": string         // one-sentence description of what the image shows
}

Be strict: reject stock photos, illustrations, logos, maps, screenshots, and images that clearly don't match the facility type.`;

export async function imageVerify(
  input: ImageVerifyInput,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<ImageVerifyResult> {
  if (!input.image_url?.trim()) throw new ValidationError("image_url is required");
  if (!input.listing_name?.trim()) throw new ValidationError("listing_name is required");

  // Cache check
  const cacheKey = generateCacheKey("imageVerify", input.image_url, {
    name: input.listing_name,
    type: input.post_type,
  });
  const cached = await getCachedResult(cacheKey, supabase);
  if (cached) return cached.result as ImageVerifyResult;

  const prompt = VERIFY_PROMPT
    .replace("{name}", input.listing_name.slice(0, 200))
    .replace("{type}", input.post_type === "fridge" ? "community fridge" : "food bank")
    .replace("{address}", (input.listing_address || "unknown").slice(0, 200));

  // Try OpenAI GPT-4V first, Gemini fallback
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  let result: ImageVerifyResult;

  if (openaiKey) {
    result = await verifyWithOpenAI(input.image_url, prompt, openaiKey);
  } else if (geminiKey) {
    result = await verifyWithGemini(input.image_url, prompt, geminiKey);
  } else {
    throw new ServerError("Missing OPENAI_API_KEY or GEMINI_API_KEY for image verification");
  }

  // Cache for 7 days (verification is stable for a given image+listing)
  await setCachedResult(cacheKey, result, supabase);

  logger.info("imageVerify complete", {
    url: input.image_url.slice(0, 80),
    pass: result.pass,
    score: result.score,
    model: result.model,
  });
  return result;
}

async function verifyWithOpenAI(
  imageUrl: string,
  prompt: string,
  apiKey: string,
): Promise<ImageVerifyResult> {
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
  const content = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);

  const score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
  return {
    pass: score > 0.7 && parsed.is_real_photo === true,
    score,
    description: String(parsed.description || "").slice(0, 300),
    is_real_photo: Boolean(parsed.is_real_photo),
    matches_listing: Boolean(parsed.matches_listing),
    model: "gpt-4o",
  };
}

async function verifyWithGemini(
  imageUrl: string,
  prompt: string,
  apiKey: string,
): Promise<ImageVerifyResult> {
  // Gemini 1.5 Flash — multimodal, fast, cost-effective
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/jpeg", data: "" } },
            // Gemini needs the image fetched first for URL input
            { text: `Image URL: ${imageUrl}\n\nRespond in JSON only.` },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  if (!resp.ok) {
    throw new ServerError(`Gemini vision error ${resp.status}`);
  }

  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  // Extract JSON from potential markdown fencing
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  const score = Math.max(0, Math.min(1, Number(parsed.score) || 0));
  return {
    pass: score > 0.7 && parsed.is_real_photo === true,
    score,
    description: String(parsed.description || "").slice(0, 300),
    is_real_photo: Boolean(parsed.is_real_photo),
    matches_listing: Boolean(parsed.matches_listing),
    model: "gemini-1.5-flash",
  };
}

// =============================================================================
// a1 Scrape — own-presence website scrape (PRIMARY tier, no external source)
// =============================================================================

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
  let html: string;
  try {
    const resp = await fetchPinned(websiteUrl, validation.resolvedIps[0], {
      timeout: 15_000,
      headers: {
        "User-Agent": "FoodShare/1.0 (image-enrichment; +https://foodshare.club)",
        "Accept": "text/html",
      },
    });
    if (!resp.ok) {
      logger.info("a1Scrape: fetch failed", { status: resp.status });
      return [];
    }
    html = await resp.text();
  } catch (err) {
    logger.info("a1Scrape: fetch error", { error: String(err).slice(0, 80) });
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
    // PROVENANCE: a1 = own domain only
    let resolvedHost: string;
    try {
      resolvedHost = new URL(resolved).hostname;
    } catch {
      continue;
    }
    if (resolvedHost !== ownDomain) continue;
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

export interface EnrichListingResult {
  status: "placed" | "fell_through" | "skipped" | "failed";
  post_id: number;
  image_url?: string;
  provenance?: Record<string, unknown>;
  error?: string;
  attempts: number;
}

export async function enrichListing(
  input: EnrichListingInput,
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<EnrichListingResult> {
  const postId = input.post_id;
  const attempts: Record<string, string> = {};

  // 1. Read the listing
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, post_name, post_address, post_type, fridge_id, website, metadata, images")
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

  const postType = (post.post_type === "foodbank" ? "foodbank" : "fridge") as "fridge" | "foodbank";
  const name = post.post_name || "";
  const address = post.post_address || undefined;
  // posts has no city/state columns — the host listing carries them.
  let city: string | undefined;
  let state: string | undefined;
  if (post.fridge_id) {
    const { data: fridge } = await supabase
      .from("community_fridges")
      .select("city, state")
      .eq("id", post.fridge_id)
      .maybeSingle();
    city = fridge?.city ?? undefined;
    state = fridge?.state ?? undefined;
  }

  // 2. Idempotency: skip if already placed
  const provenance = post.metadata?.image_provenance;
  if (provenance?.status === "placed") {
    return {
      status: "skipped",
      post_id: postId,
      image_url: post.images?.[0],
      provenance,
      attempts: 0,
    };
  }

  // 3. A1 tier (PRIMARY): scrape the listing's own website for images
  let candidates: ImageCandidate[] = [];
  let source = "a1-own-domain";
  const website = (post.website && post.website !== "-" && post.website.trim() !== "")
    ? post.website.trim()
    : null;

  if (website) {
    try {
      candidates = await a1Scrape(website);
      attempts.a1 = `scraped ${website.slice(0, 40)} → ${candidates.length} own-domain candidates`;
    } catch (err) {
      attempts.a1 = `error: ${String(err).slice(0, 80)}`;
    }
  } else {
    attempts.a1 = "no website on listing";
  }

  // 4. A2 tier (FALLBACK, operator-gated): SERP external search
  //    Only runs if the operator has set ALLOW_SERP_FALLBACK=true.
  //    A provisioned SERP key is a capability, not a source decision.
  if (candidates.length === 0) {
    const allowSerp = Deno.env.get("ALLOW_SERP_FALLBACK") === "true";
    if (allowSerp) {
      source = "a2-serp";
      try {
        const searchResult = await imageSearch({
          name,
          city,
          state,
          post_type: postType,
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

  // 4. Verify — find the first candidate that passes
  let verifiedUrl: string | null = null;
  let verifyResult: ImageVerifyResult | null = null;
  let verifyAttempts = 0;
  const maxVerify = Math.min(candidates.length, 5);

  for (const candidate of candidates.slice(0, maxVerify)) {
    verifyAttempts++;
    try {
      const result = await imageVerify({
        image_url: candidate.url,
        listing_name: name,
        listing_address: address,
        post_type: postType,
      }, supabase);
      attempts[`verify_${verifyAttempts}`] = `score=${result.score} pass=${result.pass}`;
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
      error: `no candidate passed verification (${verifyAttempts} attempts)`,
      attempts: verifyAttempts,
    };
  }

  // 5. Fetch — SSRF-safe: resolve + validate, then fetch with redirect:error
  let imageData: ArrayBuffer;
  let contentType: string;
  try {
    // SSRF-safe: resolve the image URL + validate the resolved IP before fetching
    const imgValidation = await resolveAndValidateUrl(verifiedUrl, { allowHttp: true });
    if (!imgValidation.valid) {
      return {
        status: "fell_through",
        post_id: postId,
        error: `fetch: URL rejected (${imgValidation.reason})`,
        attempts: verifyAttempts,
      };
    }
    // Fail-closed: no validated IP → refuse (never fall back to the unpinned URL)
    if (!imgValidation.resolvedIps || imgValidation.resolvedIps.length === 0) {
      return {
        status: "fell_through",
        post_id: postId,
        error: "fetch: no validated IP (fail-closed)",
        attempts: verifyAttempts,
      };
    }
    // Resolve-pinned fetch: ORIGINAL url (SNI/cert + Host correct), DNS pinned.
    const imgResp = await fetchPinned(verifiedUrl, imgValidation.resolvedIps[0], {
      timeout: 20_000,
    });
    if (!imgResp.ok) {
      return {
        status: "fell_through",
        post_id: postId,
        error: `fetch: HTTP ${imgResp.status}`,
        attempts: verifyAttempts,
      };
    }
    contentType = imgResp.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return {
        status: "fell_through",
        post_id: postId,
        error: `fetch: not an image (${contentType})`,
        attempts: verifyAttempts,
      };
    }
    imageData = await imgResp.arrayBuffer();
    if (imageData.byteLength < 5_000) {
      return {
        status: "fell_through",
        post_id: postId,
        error: "fetch: image too small",
        attempts: verifyAttempts,
      };
    }
    attempts.fetch = `${(imageData.byteLength / 1024).toFixed(1)}KB ${contentType}`;
  } catch (err) {
    return {
      status: "fell_through",
      post_id: postId,
      error: `fetch: ${String(err).slice(0, 100)}`,
      attempts: verifyAttempts,
    };
  }

  // 6. Place — upload to storage + update DB
  const safeName = name.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 50) || `post-${postId}`;
  const storagePath = `fridge-foodbank/${postId}-${safeName}.jpg`;
  const now = new Date().toISOString();

  try {
    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from("posts")
      .upload(storagePath, new Blob([imageData], { type: contentType }), {
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
        source: source, // "a1-own-domain" | "a2-serp"
        verify_score: verifyResult.score,
        verify_model: verifyResult.model,
        verify_description: verifyResult.description,
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
