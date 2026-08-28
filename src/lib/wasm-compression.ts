/**
 * WebAssembly-Powered Brotli & Gzip Compression Engine
 *
 * Direct bridge to `foodshare-compression` WebAssembly module:
 * - High-speed Brotli compression & decompression
 * - RFC 1952 Gzip compression & decompression
 * - Automated algorithm selection based on payload size
 * - SHA-256 derived HTTP ETag generation
 *
 * @module lib/wasm-compression
 */

import * as WasmCompression from "@/wasm/foodshare-compression/foodshare_compression";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toUint8Array(input: Uint8Array | string): Uint8Array {
  if (typeof input === "string") {
    return encoder.encode(input);
  }
  return input;
}

/**
 * Compress raw binary or string data using Brotli (quality 0-11, default 4).
 */
export function compressBrotli(data: Uint8Array | string, quality: number = 4): Uint8Array {
  const bytes = toUint8Array(data);
  return WasmCompression.brotli_compress(bytes, quality);
}

/**
 * Decompress Brotli-compressed byte stream into raw bytes.
 */
export function decompressBrotli(data: Uint8Array): Uint8Array {
  return WasmCompression.brotli_decompress(data);
}

/**
 * Decompress Brotli-compressed byte stream into a UTF-8 string.
 */
export function decompressBrotliString(data: Uint8Array): string {
  const decompressed = WasmCompression.brotli_decompress(data);
  return decoder.decode(decompressed);
}

/**
 * Compress raw binary or string data using Gzip (level 0-9, default 6).
 */
export function compressGzip(data: Uint8Array | string, level: number = 6): Uint8Array {
  const bytes = toUint8Array(data);
  return WasmCompression.gzip_compress(bytes, level);
}

/**
 * Decompress Gzip-compressed byte stream into raw bytes.
 */
export function decompressGzip(data: Uint8Array): Uint8Array {
  return WasmCompression.gzip_decompress(data);
}

/**
 * Decompress Gzip-compressed byte stream into a UTF-8 string.
 */
export function decompressGzipString(data: Uint8Array): string {
  const decompressed = WasmCompression.gzip_decompress(data);
  return decoder.decode(decompressed);
}

/**
 * Generate a SHA-256 based HTTP ETag for cache validation.
 */
export function generateETag(data: Uint8Array | string): string {
  const bytes = toUint8Array(data);
  return WasmCompression.generate_etag(bytes);
}

/**
 * Automatically compress with Brotli (>1KB) or Gzip (<=1KB).
 */
export function compressAuto(data: Uint8Array | string): Uint8Array {
  const bytes = toUint8Array(data);
  return WasmCompression.compress_auto(bytes);
}
