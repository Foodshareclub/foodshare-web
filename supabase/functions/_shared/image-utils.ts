/**
 * Shared Image Utilities
 */

import { logger } from "./logger.ts";

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
 * A redirect is the standard way around a hostname-based SSRF check: the
 * public URL passes validation, then 302s to a metadata service or an internal
 * address. Refusing redirects means the address that was validated is the one
 * that is contacted. The byte cap is enforced while streaming so a server that
 * never ends the response cannot exhaust the isolate's memory.
 */
export async function downloadImage(url: string): Promise<Uint8Array> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "FoodShare-ImageAPI/1.0",
    },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Image too large (max 10MB)");
  }

  if (!response.body) {
    throw new Error("Image response had no body");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("Image too large (max 10MB)");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
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
