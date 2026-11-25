/**
 * Shared Image Utilities
 */

import { logger } from "./logger.ts";
import { fetchPinned, resolveAndValidateUrl } from "./url-validation.ts";

export function detectFormat(buffer: Uint8Array): string {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return "jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "webp";
  return "jpeg";
}

const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Download an image with bounded size, a timeout, and no redirects.
 *
 * SSRF-gated (rework criterion (b)): resolveAndValidateUrl validates the URL
 * and resolves A+AAAA BEFORE any connection — a private/internal resolution
 * (ANY answer) is rejected pre-fetch — and fetchPinned pins the connection to
 * a validated IP: the address that was validated is the one contacted (no
 * re-resolve at fetch time, redirects refused, SNI and Host on the original
 * hostname, certificate validation intact). https-only, consistent with the
 * proxy path: the estate serves storage over https, and the estate's http
 * internal services are private-IP-blocked by the resolution gate regardless.
 *
 * The byte cap is enforced by the pinned fetch mid-read, so a server that
 * never ends the response cannot exhaust the isolate's memory.
 */
export async function downloadImage(url: string): Promise<Uint8Array> {
  const validation = await resolveAndValidateUrl(url, { allowHttp: false });
  if (!validation.valid) {
    throw new Error(`Failed to fetch image: URL rejected (${validation.reason})`);
  }
  // Fail-closed: no validated IP → refuse. Never fall back to the unpinned
  // URL (that would re-resolve the hostname and reopen the rebind window).
  if (!validation.resolvedIps || validation.resolvedIps.length === 0) {
    throw new Error("Failed to fetch image: no validated IP (fail-closed)");
  }
  let response: Response;
  try {
    // ORIGINAL url for SNI/cert + Host (fetchPinned arg-1 contract); the
    // validated IP pins the connection (arg 2 — no DNS inside the fetch).
    response = await fetchPinned(url, validation.resolvedIps[0], {
      timeout: 10_000,
      maxBytes: MAX_DOWNLOAD_BYTES,
      // Wikimedia rejects anonymous HTTP clients even when search succeeded.
      headers: { "User-Agent": "FoodShare-CoverSearch/1.0 (+https://foodshare.club)" },
    });
  } catch (err) {
    throw new Error(`Failed to fetch image: ${String(err).slice(0, 120)}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const buf = await response.arrayBuffer();
  if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Image too large (max 10MB)");
  }
  return new Uint8Array(buf);
}

export async function logUploadMetrics(supabase: any, metrics: {
  userId: string | null;
  bucket: string;
  path: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  compressionMethod: string;
  processingTime: number;
  storage?: "r2" | "supabase";
}) {
  try {
    await supabase.from("image_upload_metrics").insert({
      user_id: metrics.userId,
      bucket: metrics.bucket,
      path: metrics.path,
      original_size: metrics.originalSize,
      compressed_size: metrics.compressedSize,
      saved_bytes: metrics.savedBytes,
      compression_method: metrics.compressionMethod,
      processing_time_ms: metrics.processingTime,
      storage: metrics.storage || "supabase",
      uploaded_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Failed to log metrics",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
