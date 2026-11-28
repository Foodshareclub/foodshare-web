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

/**
 * Remove metadata containers that can carry GPS coordinates before an image
 * is written to public storage. Recompression is not a guarantee: a small
 * upload is returned untouched by the compression service, and a future
 * provider may preserve APP segments. This runs on the exact bytes uploaded.
 *
 * JPEG: drops APP1 (EXIF/XMP), APP13 (IPTC) and COM segments.
 * PNG: drops eXIf and textual metadata chunks.
 * WebP: drops EXIF and XMP chunks.
 * GIF: has no EXIF container; returned unchanged.
 */
export function stripImageMetadata(buffer: Uint8Array): Uint8Array {
  const format = detectFormat(buffer);
  if (format === "jpeg") return stripJpegMetadata(buffer);
  if (format === "png") return stripPngMetadata(buffer);
  if (format === "webp") return stripWebpMetadata(buffer);
  return buffer;
}

function stripJpegMetadata(input: Uint8Array): Uint8Array {
  if (input.length < 4 || input[0] !== 0xFF || input[1] !== 0xD8) {
    throw new Error("Invalid JPEG");
  }

  const out: number[] = [0xFF, 0xD8];
  let offset = 2;

  while (offset < input.length) {
    if (input[offset] !== 0xFF) throw new Error("Malformed JPEG marker");
    while (offset < input.length && input[offset] === 0xFF) offset++;
    if (offset >= input.length) throw new Error("Truncated JPEG marker");

    const marker = input[offset++];
    if (marker === 0xD9) {
      out.push(0xFF, 0xD9);
      return Uint8Array.from(out);
    }
    if (marker === 0xDA) {
      // Start of scan: copy the scan and all following entropy-coded data.
      out.push(0xFF, marker);
      for (let index = offset; index < input.length; index++) out.push(input[index]);
      return Uint8Array.from(out);
    }
    if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      out.push(0xFF, marker);
      continue;
    }

    if (offset + 2 > input.length) throw new Error("Truncated JPEG segment");
    const length = (input[offset] << 8) | input[offset + 1];
    if (length < 2 || offset + length > input.length) {
      throw new Error("Malformed JPEG segment length");
    }

    const remove = marker === 0xE1 || marker === 0xED || marker === 0xFE;
    if (!remove) {
      out.push(0xFF, marker);
      for (let index = offset; index < offset + length; index++) {
        out.push(input[index]);
      }
    }
    offset += length;
  }

  throw new Error("JPEG has no scan");
}

function stripPngMetadata(input: Uint8Array): Uint8Array {
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  if (input.length < 8 || signature.some((byte, index) => input[index] !== byte)) {
    throw new Error("Invalid PNG");
  }

  const out: number[] = [...signature];
  let offset = 8;
  while (offset + 12 <= input.length) {
    const length = readUint32BE(input, offset);
    const end = offset + 12 + length;
    if (end > input.length) throw new Error("Malformed PNG chunk");
    const type = String.fromCharCode(
      input[offset + 4],
      input[offset + 5],
      input[offset + 6],
      input[offset + 7],
    );
    const remove = type === "eXIf" || type === "tEXt" || type === "zTXt" ||
      type === "iTXt";
    if (!remove) {
      for (let index = offset; index < end; index++) out.push(input[index]);
    }
    offset = end;
  }
  if (offset !== input.length) throw new Error("Trailing PNG bytes");
  return Uint8Array.from(out);
}

function stripWebpMetadata(input: Uint8Array): Uint8Array {
  if (
    input.length < 12 ||
    String.fromCharCode(...input.subarray(0, 4)) !== "RIFF" ||
    String.fromCharCode(...input.subarray(8, 12)) !== "WEBP"
  ) {
    throw new Error("Invalid WebP");
  }

  const out: number[] = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
  let offset = 12;
  while (offset + 8 <= input.length) {
    const type = String.fromCharCode(
      input[offset],
      input[offset + 1],
      input[offset + 2],
      input[offset + 3],
    );
    const length = readUint32LE(input, offset + 4);
    const dataEnd = offset + 8 + length;
    const paddedEnd = dataEnd + (length % 2);
    if (paddedEnd > input.length) throw new Error("Malformed WebP chunk");
    if (type !== "EXIF" && type !== "XMP ") {
      for (let index = offset; index < paddedEnd; index++) out.push(input[index]);
    }
    offset = paddedEnd;
  }
  if (offset !== input.length) throw new Error("Trailing WebP bytes");

  const size = out.length - 8;
  out[4] = size & 0xFF;
  out[5] = (size >>> 8) & 0xFF;
  out[6] = (size >>> 16) & 0xFF;
  out[7] = (size >>> 24) & 0xFF;
  return Uint8Array.from(out);
}

function readUint32BE(input: Uint8Array, offset: number): number {
  return ((input[offset] << 24) |
    (input[offset + 1] << 16) |
    (input[offset + 2] << 8) |
    input[offset + 3]) >>> 0;
}

function readUint32LE(input: Uint8Array, offset: number): number {
  return (input[offset] |
    (input[offset + 1] << 8) |
    (input[offset + 2] << 16) |
    (input[offset + 3] << 24)) >>> 0;
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
