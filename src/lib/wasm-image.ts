/**
 * WebAssembly-Powered Image Geometry & Format Detection Engine
 *
 * Direct bridge to `foodshare-image` WebAssembly module:
 * - High-speed zero-allocation magic byte format detection (JPEG, PNG, GIF, WebP, AVIF, HEIC)
 * - MIME type resolution
 * - Smart width tier calculation for optimal responsive image delivery
 * - Instant zero-allocation dimension and metadata extraction
 *
 * @module lib/wasm-image
 */

import * as WasmImage from "@/wasm/foodshare-image/foodshare_image";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size_bytes: number;
  aspect_ratio?: number;
  is_landscape?: boolean;
  is_portrait?: boolean;
  is_square?: boolean;
}

/**
 * Detect image format from raw bytes (e.g. "jpeg", "png", "webp", "gif", "avif", "heic").
 */
export function detectImageFormat(data: Uint8Array): string | null {
  return WasmImage.detect_image_format(data) ?? null;
}

/**
 * Get standard MIME type from raw image bytes (e.g. "image/jpeg", "image/png", "image/webp").
 */
export function getImageMimeType(data: Uint8Array): string | null {
  return WasmImage.get_image_mime_type(data) ?? null;
}

/**
 * Calculate optimal resized target width based on raw file size tiers and current dimensions.
 *
 * Returns target width in pixels, or 0 if no resizing is required.
 */
export function calculateSmartWidth(
  fileSizeBytes: number,
  currentWidth: number,
  currentHeight: number
): number {
  return WasmImage.calculate_smart_width(fileSizeBytes, currentWidth, currentHeight);
}

/**
 * Check if the byte buffer is a valid recognized image format.
 */
export function isValidImage(data: Uint8Array): boolean {
  return WasmImage.is_valid_image(data);
}

/**
 * Extract image metadata (dimensions, format, size) directly from raw bytes.
 */
export function extractImageMetadata(data: Uint8Array): ImageMetadata | null {
  const jsonStr = WasmImage.extract_image_metadata_json(data);
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      ...parsed,
      aspect_ratio: parsed.width > 0 && parsed.height > 0 ? parsed.width / parsed.height : 1,
      is_landscape: parsed.width > parsed.height,
      is_portrait: parsed.height > parsed.width,
      is_square: parsed.width === parsed.height,
    };
  } catch {
    return null;
  }
}
