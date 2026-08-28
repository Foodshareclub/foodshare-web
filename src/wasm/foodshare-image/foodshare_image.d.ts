/* tslint:disable */
/* eslint-disable */

/**
 * Calculate optimal resized target width based on raw file size tiers and current dimensions.
 *
 * Returns target width in pixels (0 means no resize needed).
 */
export function calculate_smart_width(
  file_size_bytes: number,
  current_width: number,
  current_height: number
): number;

/**
 * Detect image format from magic bytes (JPEG, PNG, GIF, WebP, AVIF, BMP, TIFF, HEIC).
 *
 * # Arguments
 * * `data` - Raw image byte buffer (at least first 12 bytes recommended)
 *
 * # Returns
 * Format name as lowercase string (e.g. "jpeg", "png", "webp"), or None if unrecognized.
 */
export function detect_image_format(data: Uint8Array): string | undefined;

/**
 * Extract image metadata (dimensions, format, aspect ratio, orientation) as a JSON string.
 *
 * Supports instant zero-allocation parsing for JPEG, PNG, and GIF.
 *
 * # Arguments
 * * `data` - Image byte buffer
 *
 * # Returns
 * JSON string with metadata object, or None if extraction failed.
 */
export function extract_image_metadata_json(data: Uint8Array): string | undefined;

/**
 * Get the standard MIME type for an image byte buffer.
 *
 * # Arguments
 * * `data` - Raw image byte buffer
 *
 * # Returns
 * MIME type string (e.g. "image/jpeg", "image/png", "image/webp"), or None.
 */
export function get_image_mime_type(data: Uint8Array): string | undefined;

/**
 * Check if a byte buffer contains a valid recognized image format.
 */
export function is_valid_image(data: Uint8Array): boolean;
