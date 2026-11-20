/**
 * Image proxy and URL upload handlers.
 */

import { type HandlerContext, ok } from "../../_shared/api-handler.ts";
import {
  AuthenticationError,
  PayloadTooLargeError,
  RateLimitError,
  ValidationError,
} from "../../_shared/errors.ts";
import { compressImage } from "../../_shared/compression/index.ts";
import {
  fetchPinned,
  resolveAndValidateUrl,
  validateImageUrl,
} from "../../_shared/url-validation.ts";
import { detectFormat, logUploadMetrics } from "../../_shared/image-utils.ts";
import {
  checkRateLimit,
  isClientWritableBucket,
  scopedUploadPath,
  uploadImage,
} from "./storage.ts";

/**
 * Fetch an external image through the SSRF primitive.
 *
 * Replaces the exact-string hostname blocklist, which only matched hostname
 * strings: a decimal IP (2130706433), an IPv4-mapped IPv6
 * ([::ffff:169.254.169.254]) or any public-looking host that RESOLVES to an
 * internal address (DNS rebinding) sailed through it. The gate here
 * resolves A + AAAA and refuses if ANY answer is private/internal, then
 * fetches with DNS pinned to the validated IP (the pin is the rebind
 * barrier), HTTPS only, redirects rejected, and the body byte-capped
 * mid-read (10 MB, the downloadImage cap).
 */
async function fetchExternalImageBytes(imageUrl: string): Promise<Uint8Array> {
  const validation = await resolveAndValidateUrl(imageUrl, { allowHttp: false });
  if (!validation.valid) {
    throw new ValidationError(`Invalid image URL: ${validation.reason}`);
  }
  // Fail-closed: no validated IP → refuse. Never fetch the unpinned URL
  // (that would re-resolve the hostname and reopen the rebind window).
  if (!validation.resolvedIps || validation.resolvedIps.length === 0) {
    throw new ValidationError("Image URL validation failed: no resolved IP");
  }
  let response: Response;
  try {
    response = await fetchPinned(imageUrl, validation.resolvedIps[0], {
      timeout: 10_000,
      maxBytes: 10 * 1024 * 1024,
      headers: { "User-Agent": "FoodShare-ImageAPI/1.0" },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("byte cap")) {
      throw new PayloadTooLargeError("Image too large (max 10MB)", 10 * 1024 * 1024);
    }
    throw err;
  }
  if (!response.ok) {
    throw new ValidationError(`Failed to fetch: ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Proxy an external image — download, compress, and re-upload.
 */
export async function handleProxy(ctx: HandlerContext): Promise<Response> {
  // The factory already parsed the body; `ctx.request.json()` would throw
  // "Body already used" on every call.
  const body = (ctx.body ?? {}) as { url?: string; bucket?: string };
  const imageUrl = body.url;
  const bucket = body.bucket || "food-images";

  const { userId, supabase } = ctx;
  if (!userId) {
    throw new AuthenticationError("Authentication required to proxy images");
  }
  if (!isClientWritableBucket(bucket)) {
    throw new ValidationError(`Invalid bucket: ${bucket}`);
  }
  if (!(await checkRateLimit(userId, supabase))) {
    throw new RateLimitError("Maximum 100 uploads per day");
  }

  if (!imageUrl) {
    throw new ValidationError("Missing 'url' field");
  }

  // Image plausibility (extension / known host); the SSRF gate is below.
  const urlValidation = validateImageUrl(imageUrl);
  if (!urlValidation.valid) {
    throw new ValidationError(`Invalid image URL: ${urlValidation.reason}`);
  }

  // SSRF gate + fetch: resolved-IP validation, DNS-pinned, HTTPS-only,
  // redirects rejected, byte-capped mid-read (fetchExternalImageBytes).
  const imageData = await fetchExternalImageBytes(imageUrl);

  if (imageData.length > 10 * 1024 * 1024) {
    throw new PayloadTooLargeError(
      "Image too large (max 10MB)",
      10 * 1024 * 1024,
    );
  }

  const compressed = await compressImage(imageData, 800);
  const format = detectFormat(compressed.buffer);
  const filename = `${crypto.randomUUID()}.${format}`;

  const { publicUrl, storage } = await uploadImage(
    ctx.supabase,
    bucket,
    filename,
    compressed.buffer,
    `image/${format}`,
  );

  return ok({
    data: {
      url: publicUrl,
      path: filename,
      originalUrl: imageUrl,
    },
    metadata: {
      originalSize: imageData.length,
      compressedSize: compressed.compressedSize,
      savedBytes: imageData.length - compressed.compressedSize,
      savedPercent: compressed.savedPercent,
      format,
      storage,
    },
  }, ctx);
}

/**
 * Download an external image by URL and upload to storage.
 */
export async function handleUploadFromUrl(
  ctx: HandlerContext,
): Promise<Response> {
  const startTime = Date.now();

  const body = (ctx.body ?? {}) as {
    imageUrl?: string;
    url?: string;
    bucket?: string;
    path?: string;
    challengeId?: string;
  };
  const imageUrl = body.imageUrl || body.url;
  const bucket = body.bucket || "challenges";
  const customPath = body.path;
  const challengeId = body.challengeId;

  const { userId, supabase } = ctx;
  if (!userId) {
    throw new AuthenticationError("Authentication required to upload images");
  }
  if (!isClientWritableBucket(bucket)) {
    throw new ValidationError(`Invalid bucket: ${bucket}`);
  }
  if (!(await checkRateLimit(userId, supabase))) {
    throw new RateLimitError("Maximum 100 uploads per day");
  }

  if (!imageUrl) {
    throw new ValidationError("Missing imageUrl");
  }

  // SSRF gate + fetch: resolved-IP validation, DNS-pinned, HTTPS-only,
  // redirects rejected, byte-capped mid-read (fetchExternalImageBytes).
  const imageData = await fetchExternalImageBytes(imageUrl);

  if (imageData.length > 10 * 1024 * 1024) {
    throw new PayloadTooLargeError(
      "Image too large (max 10MB)",
      10 * 1024 * 1024,
    );
  }

  const originalSize = imageData.length;
  const compressed = await compressImage(imageData, 800);
  const format = detectFormat(compressed.buffer);
  const filename = scopedUploadPath(userId, customPath, format);

  const { publicUrl, storage } = await uploadImage(
    supabase,
    bucket,
    filename,
    compressed.buffer,
    `image/${format}`,
  );

  if (challengeId) {
    await supabase
      .from("challenges")
      .update({ challenge_image: publicUrl })
      .eq("id", challengeId);
  }

  const processingTime = Date.now() - startTime;

  await logUploadMetrics(supabase, {
    userId: null,
    bucket,
    path: filename,
    originalSize,
    compressedSize: compressed.compressedSize,
    savedBytes: originalSize - compressed.compressedSize,
    compressionMethod: compressed.method,
    processingTime,
    storage,
  });

  return ok({
    challengeId,
    publicUrl,
    filePath: filename,
    metadata: {
      originalSize,
      compressedSize: compressed.compressedSize,
      savedBytes: originalSize - compressed.compressedSize,
      storage,
    },
  }, ctx);
}
