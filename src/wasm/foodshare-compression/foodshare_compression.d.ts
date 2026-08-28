/* tslint:disable */
/* eslint-disable */

/**
 * Compress data using Brotli.
 *
 * # Arguments
 * * `data` - Data to compress
 * * `quality` - Compression level (0-11, higher = better compression but slower)
 *
 * # Returns
 * Compressed data as Uint8Array
 */
export function brotli_compress(data: Uint8Array, quality: number): Uint8Array;

/**
 * Decompress Brotli data.
 */
export function brotli_decompress(data: Uint8Array): Uint8Array;

/**
 * Compress data with automatic algorithm selection based on size.
 *
 * Uses Brotli for larger payloads (>1KB), Gzip otherwise.
 */
export function compress_auto(data: Uint8Array): Uint8Array;

/**
 * Generate ETag for data (SHA-256 based).
 */
export function generate_etag(data: Uint8Array): string;

/**
 * Compress data using Gzip.
 *
 * # Arguments
 * * `data` - Data to compress
 * * `level` - Compression level (0-9)
 */
export function gzip_compress(data: Uint8Array, level: number): Uint8Array;

/**
 * Decompress Gzip data.
 */
export function gzip_decompress(data: Uint8Array): Uint8Array;
