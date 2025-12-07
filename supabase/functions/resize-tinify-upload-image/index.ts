/**
 * Image Resize & Compress Edge Function
 *
 * Optimizes images before upload using:
 * 1. ImageMagick WASM (free, unlimited) - resize + initial compression
 * 2. TinyPNG (optional) - only if image still > 500KB after step 1
 *
 * Outputs JPEG for photos (smaller than PNG) or WebP for best compression.
 */

import { crypto } from "https://deno.land/std@0.201.0/crypto/mod.ts";
import {
  ImageMagick,
  initialize,
  MagickFormat,
  MagickGeometry,
} from "https://deno.land/x/imagemagick_deno@0.0.31/mod.ts";
import { Tinify } from "https://deno.land/x/tinify@v1.0.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import response from "../_shared/response.ts";
import { handleCorsPrelight, getPermissiveCorsHeaders } from "../_shared/cors.ts";
import { STORAGE_BUCKETS, validateFile } from "../_shared/storage-constants.ts";

// Configuration
const CONFIG = {
  maxWidth: 1920, // Max dimension (width or height)
  maxHeight: 1920,
  jpegQuality: 82, // Good balance of quality vs size
  webpQuality: 80,
  tinifyThreshold: 500 * 1024, // Only use TinyPNG if > 500KB after ImageMagick
  targetBucket: STORAGE_BUCKETS.POSTS, // Default bucket for uploads
} as const;

// Helper to convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Detect if image is likely a photo (should use JPEG) or graphic (should use PNG/WebP)
function shouldUseJpeg(width: number, height: number, originalSize: number): boolean {
  // Photos are typically larger and have more pixels
  // Graphics/logos are typically smaller
  const pixelCount = width * height;
  const bytesPerPixel = originalSize / pixelCount;

  // Photos typically have high entropy (more bytes per pixel after compression)
  // Simple graphics compress much better
  return bytesPerPixel > 0.5 || pixelCount > 500000;
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  const corsHeaders = getPermissiveCorsHeaders();

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const tinifyApiKey = Deno.env.get("TINIFY_API_KEY");

    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      console.error("Missing Supabase environment variables");
      return response(
        JSON.stringify({ error: "Server configuration error" }),
        500
      );
    }

    // Parse request - support both raw binary and multipart form data
    let imageData: Uint8Array;
    let targetBucket = CONFIG.targetBucket;
    let customPath = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle form data upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const bucket = formData.get("bucket") as string | null;
      const path = formData.get("path") as string | null;

      if (!file) {
        return response(JSON.stringify({ error: "No file provided" }), 400);
      }

      imageData = new Uint8Array(await file.arrayBuffer());
      if (bucket && Object.values(STORAGE_BUCKETS).includes(bucket as any)) {
        targetBucket = bucket as typeof CONFIG.targetBucket;
      }
      if (path) customPath = path;
    } else {
      // Handle raw binary upload
      imageData = new Uint8Array(await req.arrayBuffer());

      // Check for bucket in query params or headers
      const url = new URL(req.url);
      const bucketParam = url.searchParams.get("bucket") || req.headers.get("x-bucket");
      const pathParam = url.searchParams.get("path") || req.headers.get("x-path");

      if (bucketParam && Object.values(STORAGE_BUCKETS).includes(bucketParam as any)) {
        targetBucket = bucketParam as typeof CONFIG.targetBucket;
      }
      if (pathParam) customPath = pathParam;
    }

    if (imageData.length === 0) {
      return response(JSON.stringify({ error: "Empty file" }), 400);
    }

    const originalSize = imageData.length;
    console.log(`Processing image: ${(originalSize / 1024).toFixed(1)}KB`);

    // Initialize ImageMagick
    await initialize();

    // Process with ImageMagick
    const processedData = await new Promise<{
      buffer: Uint8Array;
      format: "jpeg" | "webp" | "png";
      width: number;
      height: number;
    }>((resolve, reject) => {
      try {
        ImageMagick.read(imageData, (img) => {
          const originalWidth = img.width;
          const originalHeight = img.height;

          // Calculate new dimensions maintaining aspect ratio
          let newWidth = originalWidth;
          let newHeight = originalHeight;

          if (originalWidth > CONFIG.maxWidth || originalHeight > CONFIG.maxHeight) {
            const widthRatio = CONFIG.maxWidth / originalWidth;
            const heightRatio = CONFIG.maxHeight / originalHeight;
            const ratio = Math.min(widthRatio, heightRatio);

            newWidth = Math.round(originalWidth * ratio);
            newHeight = Math.round(originalHeight * ratio);

            // Resize using high-quality Lanczos filter
            img.resize(new MagickGeometry(newWidth, newHeight));
            console.log(`Resized: ${originalWidth}x${originalHeight} → ${newWidth}x${newHeight}`);
          }

          // Strip metadata (EXIF, etc.) to reduce size
          img.strip();

          // Determine output format
          const useJpeg = shouldUseJpeg(newWidth, newHeight, originalSize);
          const outputFormat = useJpeg ? MagickFormat.Jpeg : MagickFormat.WebP;
          const quality = useJpeg ? CONFIG.jpegQuality : CONFIG.webpQuality;

          // Set quality
          img.quality = quality;

          // Write to buffer
          img.write(outputFormat, (data) => {
            resolve({
              buffer: data,
              format: useJpeg ? "jpeg" : "webp",
              width: newWidth,
              height: newHeight,
            });
          });
        });
      } catch (err) {
        reject(err);
      }
    });

    let finalBuffer = processedData.buffer;
    let finalFormat = processedData.format;
    const afterMagickSize = finalBuffer.length;

    console.log(
      `After ImageMagick: ${(afterMagickSize / 1024).toFixed(1)}KB (${processedData.format.toUpperCase()})`
    );

    // Use TinyPNG only if still large AND we have an API key
    if (tinifyApiKey && afterMagickSize > CONFIG.tinifyThreshold) {
      try {
        console.log(`Image still > ${CONFIG.tinifyThreshold / 1024}KB, using TinyPNG...`);
        const tinify = new Tinify({ api_key: tinifyApiKey });
        const tinyResult = await tinify.compress(finalBuffer);
        const tinyBase64 = await tinyResult.toBase64();
        finalBuffer = new Uint8Array(base64ToArrayBuffer(tinyBase64.base64));

        console.log(`After TinyPNG: ${(finalBuffer.length / 1024).toFixed(1)}KB`);
      } catch (tinifyError) {
        // TinyPNG failed (rate limit, etc.) - continue with ImageMagick result
        console.warn("TinyPNG compression failed, using ImageMagick result:", tinifyError);
      }
    }

    // Validate final file
    const mimeType = finalFormat === "jpeg" ? "image/jpeg" : `image/${finalFormat}`;
    const bucketKey = Object.keys(STORAGE_BUCKETS).find(
      (key) => STORAGE_BUCKETS[key as keyof typeof STORAGE_BUCKETS] === targetBucket
    ) as keyof typeof STORAGE_BUCKETS;

    const validation = validateFile(mimeType, finalBuffer.length, bucketKey);
    if (!validation.valid) {
      return response(JSON.stringify({ error: validation.error }), 400);
    }

    // Generate filename
    const extension = finalFormat === "jpeg" ? "jpg" : finalFormat;
    const timestamp = Date.now();
    const uuid = crypto.randomUUID().slice(0, 8);
    const fileName = customPath
      ? `${customPath}/${uuid}-${timestamp}.${extension}`
      : `${uuid}-${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey || supabaseAnonKey!,
      { auth: { persistSession: false } }
    );

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(targetBucket)
      .upload(fileName, finalBuffer, {
        contentType: mimeType,
        cacheControl: "31536000", // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return response(JSON.stringify({ error: uploadError.message }), 400);
    }

    // Calculate compression stats
    const finalSize = finalBuffer.length;
    const savedBytes = originalSize - finalSize;
    const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);
    const duration = Date.now() - startTime;

    console.log(
      `✓ Uploaded ${fileName}: ${(originalSize / 1024).toFixed(1)}KB → ${(finalSize / 1024).toFixed(1)}KB (${savedPercent}% saved) in ${duration}ms`
    );

    // Return success response with metadata
    return response(
      JSON.stringify({
        success: true,
        data: uploadData,
        metadata: {
          originalSize,
          finalSize,
          savedBytes,
          savedPercent: parseFloat(savedPercent),
          format: finalFormat,
          width: processedData.width,
          height: processedData.height,
          bucket: targetBucket,
          path: fileName,
          duration,
        },
      }),
      200
    );
  } catch (error) {
    console.error("Image processing error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error processing image",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
