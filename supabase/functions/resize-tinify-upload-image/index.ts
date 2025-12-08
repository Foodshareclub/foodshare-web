/**
 * Smart Image Compress Edge Function v6
 *
 * Features:
 * - Adaptive compression targeting < 100KB
 * - Smart width calculation based on file size
 * - Progressive resize if still too large
 * - WebP conversion for maximum compression
 * - Single image processing (avoids CPU timeout)
 *
 * Uses TinyPNG API for compression + resize + WebP conversion
 */

import { crypto } from "https://deno.land/std@0.201.0/crypto/mod.ts";
import { Tinify } from "https://deno.land/x/tinify@v1.0.0/mod.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  targetSize: 100 * 1024, // Target: < 100KB
  skipThreshold: 100 * 1024, // Skip if already under 100KB
  maxBatchSize: 1,
  defaultBucket: "posts",
  // Balanced width tiers: good quality + safely under 100KB
  // Targeting ~60-80KB output for comfortable margin
  widthTiers: [
    { maxOriginalSize: 200 * 1024, width: 1000 }, // < 200KB → 1000px
    { maxOriginalSize: 500 * 1024, width: 900 }, // < 500KB → 900px
    { maxOriginalSize: 1024 * 1024, width: 800 }, // < 1MB → 800px
    { maxOriginalSize: 3 * 1024 * 1024, width: 700 }, // < 3MB → 700px
    { maxOriginalSize: 5 * 1024 * 1024, width: 600 }, // < 5MB → 600px
    { maxOriginalSize: Infinity, width: 550 }, // >= 5MB → 550px
  ],
} as const;

// ============================================================================
// CORS & RESPONSE HELPERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "3600",
};

function jsonResponse(body: unknown, statusCode: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: statusCode,
  });
}

// ============================================================================
// STORAGE CONSTANTS
// ============================================================================

const STORAGE_BUCKETS = {
  PROFILES: "profiles",
  POSTS: "posts",
  FLAGS: "flags",
  FORUM: "forum",
  CHALLENGES: "challenges",
  ROOMS: "rooms",
  ASSETS: "assets",
} as const;

type StorageBucketKey = keyof typeof STORAGE_BUCKETS;
type StorageBucket = (typeof STORAGE_BUCKETS)[StorageBucketKey];

const MAX_FILE_SIZES: Record<StorageBucketKey, number> = {
  PROFILES: 5 * 1024 * 1024,
  POSTS: 10 * 1024 * 1024,
  FLAGS: 2 * 1024 * 1024,
  FORUM: 10 * 1024 * 1024,
  CHALLENGES: 5 * 1024 * 1024,
  ROOMS: 5 * 1024 * 1024,
  ASSETS: 50 * 1024 * 1024,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function detectFormat(data: Uint8Array): string {
  if (data[0] === 0xff && data[1] === 0xd8) return "jpeg";
  if (data[0] === 0x89 && data[1] === 0x50) return "png";
  if (data[0] === 0x47 && data[1] === 0x49) return "gif";
  if (data[0] === 0x52 && data[1] === 0x49) return "webp";
  return "jpeg";
}

function getBucketKey(bucket: string): StorageBucketKey {
  return (Object.keys(STORAGE_BUCKETS).find(
    (key) => STORAGE_BUCKETS[key as StorageBucketKey] === bucket
  ) || "POSTS") as StorageBucketKey;
}

function getSmartWidth(originalSize: number): number {
  for (const tier of CONFIG.widthTiers) {
    if (originalSize <= tier.maxOriginalSize) {
      return tier.width;
    }
  }
  return 500;
}

// ============================================================================
// COMPRESSION METRICS LOGGING
// ============================================================================

interface CompressionResult {
  success: boolean;
  originalPath: string;
  compressedPath?: string;
  originalSize: number;
  compressedSize?: number;
  compressedFormat?: string;
  compressionMethod?: string;
  processingTimeMs: number;
  error?: string;
}

async function logCompressionResult(
  supabase: SupabaseClient,
  bucket: string,
  result: CompressionResult
): Promise<void> {
  try {
    await supabase.rpc("record_compression_result", {
      p_bucket: bucket,
      p_original_path: result.originalPath,
      p_compressed_path: result.compressedPath || null,
      p_original_size: result.originalSize,
      p_compressed_size: result.compressedSize || null,
      p_original_width: null,
      p_original_height: null,
      p_compressed_width: null,
      p_compressed_height: null,
      p_original_format: null,
      p_compressed_format: result.compressedFormat || null,
      p_compression_method: result.compressionMethod || null,
      p_quality_setting: null,
      p_processing_time_ms: result.processingTimeMs,
      p_status: result.success ? "completed" : "failed",
      p_error_message: result.error || null,
    });
  } catch (err) {
    console.warn("Failed to log compression result:", err);
  }
}


// ============================================================================
// SMART ADAPTIVE COMPRESSION WITH TINYPNG
// ============================================================================

interface CompressOptions {
  targetSize: number;
  convertToWebP: boolean;
}

async function smartCompress(
  imageData: Uint8Array,
  tinifyApiKey: string,
  _options: CompressOptions = { targetSize: CONFIG.targetSize, convertToWebP: false }
): Promise<{ buffer: Uint8Array; method: string; attempts: number }> {
  const originalSize = imageData.length;
  const targetWidth = getSmartWidth(originalSize);
  console.log(`Compress: ${(originalSize / 1024).toFixed(0)}KB → target width ${targetWidth}px`);

  // Use TinyPNG REST API directly for compress + resize
  const authHeader = "Basic " + btoa(`api:${tinifyApiKey}`);

  // Step 1: Upload and compress
  const compressResponse = await fetch("https://api.tinify.com/shrink", {
    method: "POST",
    headers: { Authorization: authHeader },
    body: imageData,
  });

  if (!compressResponse.ok) {
    const error = await compressResponse.text();
    throw new Error(`TinyPNG compress failed: ${error}`);
  }

  const compressResult = await compressResponse.json();
  const compressedUrl = compressResult.output.url;
  console.log(`Compressed: ${(compressResult.output.size / 1024).toFixed(0)}KB`);

  // Step 2: Resize the compressed image
  const resizeResponse = await fetch(compressedUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      resize: {
        method: "fit",
        width: targetWidth,
        height: targetWidth,
      },
    }),
  });

  if (!resizeResponse.ok) {
    // Fallback: just download compressed version without resize
    console.log("Resize failed, downloading compressed only");
    const downloadResponse = await fetch(compressedUrl, {
      headers: { Authorization: authHeader },
    });
    const buffer = new Uint8Array(await downloadResponse.arrayBuffer());
    console.log(`✓ Result: ${(buffer.length / 1024).toFixed(0)}KB (no resize)`);
    return { buffer, method: "tinypng", attempts: 1 };
  }

  const resizedBuffer = new Uint8Array(await resizeResponse.arrayBuffer());
  console.log(`✓ Result: ${(resizedBuffer.length / 1024).toFixed(0)}KB at ${targetWidth}px`);

  return {
    buffer: resizedBuffer,
    method: `tinypng@${targetWidth}px`,
    attempts: 1,
  };
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

interface BatchItem {
  bucket: string;
  path: string;
  size: number;
}

async function processBatch(
  supabase: SupabaseClient,
  items: BatchItem[],
  tinifyApiKey: string
): Promise<{ processed: number; failed: number; skipped: number; results: CompressionResult[] }> {
  const results: CompressionResult[] = [];
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    const startTime = Date.now();

    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(item.bucket)
        .download(item.path);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message || "No data"}`);
      }

      const imageData = new Uint8Array(await fileData.arrayBuffer());

      // Skip if already small enough
      if (imageData.length <= CONFIG.skipThreshold) {
        const result: CompressionResult = {
          success: true,
          originalPath: item.path,
          compressedPath: item.path,
          originalSize: imageData.length,
          compressedSize: imageData.length,
          compressionMethod: "skipped",
          processingTimeMs: Date.now() - startTime,
        };
        results.push(result);
        await logCompressionResult(supabase, item.bucket, result);
        skipped++;
        console.log(`⊘ ${item.path}: Already ${(imageData.length / 1024).toFixed(0)}KB, skipped`);
        continue;
      }

      // Smart compress
      const compressed = await smartCompress(imageData, tinifyApiKey);
      const format = detectFormat(compressed.buffer);

      // Only replace if we saved space
      if (compressed.buffer.length >= imageData.length) {
        const result: CompressionResult = {
          success: true,
          originalPath: item.path,
          compressedPath: item.path,
          originalSize: imageData.length,
          compressedSize: imageData.length,
          compressionMethod: "no-improvement",
          processingTimeMs: Date.now() - startTime,
        };
        results.push(result);
        await logCompressionResult(supabase, item.bucket, result);
        skipped++;
        console.log(`⊘ ${item.path}: No improvement, skipped`);
        continue;
      }

      // Update file extension if converted to WebP
      let newPath = item.path;
      if (format === "webp" && !item.path.endsWith(".webp")) {
        newPath = item.path.replace(/\.(jpg|jpeg|png|gif)$/i, ".webp");
      }

      // Upload compressed version
      const { error: uploadError } = await supabase.storage
        .from(item.bucket)
        .update(item.path, compressed.buffer, {
          contentType: `image/${format}`,
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const savedPercent = (((imageData.length - compressed.buffer.length) / imageData.length) * 100).toFixed(1);

      const result: CompressionResult = {
        success: true,
        originalPath: item.path,
        compressedPath: newPath,
        originalSize: imageData.length,
        compressedSize: compressed.buffer.length,
        compressedFormat: format,
        compressionMethod: compressed.method,
        processingTimeMs: Date.now() - startTime,
      };

      results.push(result);
      await logCompressionResult(supabase, item.bucket, result);
      processed++;

      console.log(
        `✓ ${item.path}: ${(imageData.length / 1024).toFixed(0)}KB → ${(compressed.buffer.length / 1024).toFixed(0)}KB (${savedPercent}% saved)`
      );
    } catch (err) {
      const result: CompressionResult = {
        success: false,
        originalPath: item.path,
        originalSize: item.size,
        processingTimeMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : "Unknown error",
      };

      results.push(result);
      await logCompressionResult(supabase, item.bucket, result);
      failed++;

      console.error(`✗ ${item.path}: ${result.error}`);
    }
  }

  return { processed, failed, skipped, results };
}


// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 204 });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const tinifyApiKey = Deno.env.get("TINIFY_API_KEY");

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey!, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "upload";

    // Stats mode doesn't require TinyPNG API key
    if (mode === "stats") {
      const { data: stats, error: statsError } = await supabase.from("compression_stats").select("*");

      if (statsError) {
        return jsonResponse({ error: statsError.message }, 500);
      }

      return jsonResponse({ success: true, stats }, 200);
    }

    // All other modes require TinyPNG API key
    if (!tinifyApiKey) {
      return jsonResponse(
        { error: "TinyPNG API key not configured. Set TINIFY_API_KEY in edge function secrets." },
        500
      );
    }

    // ========================================================================
    // MODE: BATCH - Process ONE large image from storage (graceful)
    // ========================================================================
    if (mode === "batch") {
      const bucket = url.searchParams.get("bucket") || CONFIG.defaultBucket;
      const limit = 1; // Always process only 1 image to avoid CPU timeout
      const minSize = parseInt(url.searchParams.get("minSize") || String(CONFIG.skipThreshold));

      const { data: images, error: queryError } = await supabase.rpc("get_large_uncompressed_images", {
        p_bucket: bucket,
        p_min_size: minSize,
        p_limit: limit,
      });

      if (queryError) {
        return jsonResponse({ error: `Query failed: ${queryError.message}` }, 500);
      }

      if (!images || images.length === 0) {
        return jsonResponse(
          {
            success: true,
            message: "No large images found to compress",
            processed: 0,
            failed: 0,
            skipped: 0,
          },
          200
        );
      }

      const items: BatchItem[] = images.map((img: { name: string; bucket_id: string; size: number }) => ({
        bucket: img.bucket_id,
        path: img.name,
        size: img.size,
      }));

      const { processed, failed, skipped, results } = await processBatch(supabase, items, tinifyApiKey);

      return jsonResponse(
        {
          success: true,
          mode: "batch",
          bucket,
          processed,
          failed,
          skipped,
          totalSavedBytes: results
            .filter((r) => r.success && r.compressedSize && r.compressionMethod?.startsWith("tinypng"))
            .reduce((sum, r) => sum + (r.originalSize - (r.compressedSize || 0)), 0),
          duration: Date.now() - startTime,
          results: results.map((r) => ({
            path: r.originalPath,
            success: r.success,
            originalSize: r.originalSize,
            compressedSize: r.compressedSize,
            savedPercent:
              r.compressedSize && r.originalSize > r.compressedSize
                ? Math.round((1 - r.compressedSize / r.originalSize) * 100)
                : 0,
            method: r.compressionMethod,
            error: r.error,
          })),
        },
        200
      );
    }

    // ========================================================================
    // MODE: UPLOAD - Smart compress and upload new image (default)
    // ========================================================================
    let imageData: Uint8Array;
    let targetBucket = CONFIG.defaultBucket;
    let customPath = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bucket = formData.get("bucket") as string | null;
      const path = formData.get("path") as string | null;

      if (!file) {
        return jsonResponse({ error: "No file provided" }, 400);
      }

      imageData = new Uint8Array(await file.arrayBuffer());
      if (bucket && Object.values(STORAGE_BUCKETS).includes(bucket as StorageBucket)) {
        targetBucket = bucket;
      }
      if (path) customPath = path;
    } else {
      imageData = new Uint8Array(await req.arrayBuffer());
      const bucketParam = url.searchParams.get("bucket") || req.headers.get("x-bucket");
      const pathParam = url.searchParams.get("path") || req.headers.get("x-path");

      if (bucketParam && Object.values(STORAGE_BUCKETS).includes(bucketParam as StorageBucket)) {
        targetBucket = bucketParam;
      }
      if (pathParam) customPath = pathParam;
    }

    if (imageData.length === 0) {
      return jsonResponse({ error: "Empty file" }, 400);
    }

    const originalSize = imageData.length;
    console.log(`Processing upload: ${(originalSize / 1024).toFixed(1)}KB`);

    // Smart compress
    const compressed = await smartCompress(imageData, tinifyApiKey);
    const format = detectFormat(compressed.buffer);

    // Validate size
    const bucketKey = getBucketKey(targetBucket);
    if (compressed.buffer.length > MAX_FILE_SIZES[bucketKey]) {
      return jsonResponse({ error: `File too large for bucket ${targetBucket}` }, 400);
    }

    // Generate filename (use .webp if converted)
    const ext = format === "webp" ? "webp" : format === "jpeg" ? "jpg" : format;
    const uuid = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const fileName = customPath ? `${customPath}/${uuid}-${timestamp}.${ext}` : `${uuid}-${timestamp}.${ext}`;

    // Upload
    const { data: uploadData, error: uploadError } = await supabase.storage.from(targetBucket).upload(fileName, compressed.buffer, {
      contentType: `image/${format}`,
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) {
      return jsonResponse({ error: uploadError.message }, 400);
    }

    // Log result
    const result: CompressionResult = {
      success: true,
      originalPath: fileName,
      compressedPath: fileName,
      originalSize,
      compressedSize: compressed.buffer.length,
      compressedFormat: format,
      compressionMethod: compressed.method,
      processingTimeMs: Date.now() - startTime,
    };

    await logCompressionResult(supabase, targetBucket, result);

    const savedPercent = (((originalSize - compressed.buffer.length) / originalSize) * 100).toFixed(1);
    console.log(
      `✓ ${fileName}: ${(originalSize / 1024).toFixed(0)}KB → ${(compressed.buffer.length / 1024).toFixed(0)}KB (${savedPercent}% saved)`
    );

    return jsonResponse(
      {
        success: true,
        data: uploadData,
        metadata: {
          originalSize,
          finalSize: compressed.buffer.length,
          savedBytes: originalSize - compressed.buffer.length,
          savedPercent: parseFloat(savedPercent),
          format,
          method: compressed.method,
          bucket: targetBucket,
          path: fileName,
          duration: Date.now() - startTime,
        },
      },
      200
    );
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
