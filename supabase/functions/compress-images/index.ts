/**
 * Compress Large Images - Cron Job
 * 
 * Finds images over 500KB in storage and compresses them using TinyPNG.
 * Designed to be triggered by Supabase cron or external scheduler.
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - TINIFY_API_KEY
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Tinify } from "https://deno.land/x/tinify@v1.0.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

const BATCH_SIZE = 10; // Process 10 images per run (TinyPNG rate limits)
const MIN_SIZE_BYTES = 500_000; // 500KB threshold
const TARGET_MAX_WIDTH = 1920; // Max dimension for resized images

interface StorageObject {
  name: string;
  bucket_id: string;
  metadata: {
    size: number;
    mimetype: string;
  };
}

interface CompressionResult {
  path: string;
  originalSize: number;
  compressedSize: number;
  savings: string;
  status: "success" | "error" | "skipped";
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: CompressionResult[] = [];

  try {
    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const tinifyApiKey = Deno.env.get("TINIFY_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !tinifyApiKey) {
      throw new Error("Missing required environment variables");
    }

    // Parse request body for options
    let bucket = "posts";
    let limit = BATCH_SIZE;
    let dryRun = false;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        bucket = body.bucket || bucket;
        limit = Math.min(body.limit || limit, 50); // Max 50 per run
        dryRun = body.dryRun || false;
      } catch {
        // Use defaults if no body
      }
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const tinify = new Tinify({ api_key: tinifyApiKey });

    // Find large images that haven't been compressed
    // We track compressed images by checking if they have a 'compressed' metadata flag
    const { data: largeImages, error: queryError } = await supabase
      .rpc("get_uncompressed_large_images", {
        p_bucket: bucket,
        p_min_size: MIN_SIZE_BYTES,
        p_limit: limit,
      });

    // Fallback to direct query if RPC doesn't exist
    let imagesToProcess: StorageObject[] = [];
    
    if (queryError || !largeImages) {
      // Direct query fallback
      const { data, error } = await supabase
        .from("objects")
        .select("name, bucket_id, metadata")
        .eq("bucket_id", bucket)
        .gte("metadata->size", MIN_SIZE_BYTES)
        .like("metadata->mimetype", "image/%")
        .is("metadata->compressed", null) // Not yet compressed
        .order("metadata->size", { ascending: false })
        .limit(limit);

      if (error) {
        // If schema access fails, use storage API to list
        console.log("Direct query failed, using storage list API");
        const { data: listData } = await supabase.storage.from(bucket).list("", {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        });

        // Filter large images manually (less efficient but works)
        if (listData) {
          for (const item of listData) {
            if (item.metadata?.size > MIN_SIZE_BYTES && 
                item.metadata?.mimetype?.startsWith("image/") &&
                !item.metadata?.compressed) {
              imagesToProcess.push({
                name: item.name,
                bucket_id: bucket,
                metadata: item.metadata as StorageObject["metadata"],
              });
              if (imagesToProcess.length >= limit) break;
            }
          }
        }
      } else {
        imagesToProcess = data || [];
      }
    } else {
      imagesToProcess = largeImages;
    }

    console.log(`Found ${imagesToProcess.length} images to compress`);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          imagesToProcess: imagesToProcess.map((img) => ({
            path: img.name,
            size: img.metadata?.size,
            sizeMB: ((img.metadata?.size || 0) / 1024 / 1024).toFixed(2),
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each image
    for (const image of imagesToProcess) {
      const result: CompressionResult = {
        path: image.name,
        originalSize: image.metadata?.size || 0,
        compressedSize: 0,
        savings: "0%",
        status: "error",
      };

      try {
        // Download original image
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(image.name);

        if (downloadError || !fileData) {
          result.error = `Download failed: ${downloadError?.message}`;
          results.push(result);
          continue;
        }

        const originalBuffer = new Uint8Array(await fileData.arrayBuffer());
        console.log(`Processing ${image.name} (${(result.originalSize / 1024 / 1024).toFixed(2)}MB)`);

        // Compress with TinyPNG
        const compressedImage = await tinify.compress(originalBuffer);
        
        // Resize if needed (TinyPNG supports resize in same call)
        const resizedImage = await compressedImage.resize({
          method: "fit",
          width: TARGET_MAX_WIDTH,
          height: TARGET_MAX_WIDTH,
        });

        // Get compressed buffer
        const compressedBase64 = await resizedImage.toBase64();
        const compressedBuffer = Uint8Array.from(atob(compressedBase64.base64), (c) => c.charCodeAt(0));
        
        result.compressedSize = compressedBuffer.length;
        const savingsPercent = ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1);
        result.savings = `${savingsPercent}%`;

        // Only update if we actually saved space (at least 10%)
        if (result.compressedSize < result.originalSize * 0.9) {
          // Upload compressed version (overwrite)
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .update(image.name, compressedBuffer, {
              contentType: image.metadata?.mimetype || "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            result.error = `Upload failed: ${uploadError.message}`;
            results.push(result);
            continue;
          }

          // Record compression in tracking table
          await supabase.rpc("record_compressed_image", {
            p_bucket: bucket,
            p_path: image.name,
            p_original_size: result.originalSize,
            p_compressed_size: result.compressedSize,
          });

          result.status = "success";
          console.log(
            `✓ Compressed ${image.name}: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB → ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB (${result.savings} saved)`
          );
        } else {
          result.status = "skipped";
          result.error = "Compression savings less than 10%";
          console.log(`⊘ Skipped ${image.name}: savings only ${result.savings}`);
        }

        results.push(result);
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Unknown error";
        results.push(result);
        console.error(`✗ Error processing ${image.name}:`, result.error);
      }
    }

    // Calculate summary
    const successful = results.filter((r) => r.status === "success");
    const totalOriginal = successful.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressed = successful.reduce((sum, r) => sum + r.compressedSize, 0);
    const totalSaved = totalOriginal - totalCompressed;

    const summary = {
      processed: results.length,
      successful: successful.length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "error").length,
      totalSavedMB: (totalSaved / 1024 / 1024).toFixed(2),
      totalSavedPercent: totalOriginal > 0 
        ? ((totalSaved / totalOriginal) * 100).toFixed(1) 
        : "0",
      durationMs: Date.now() - startTime,
    };

    console.log(`\nSummary: ${summary.successful}/${summary.processed} compressed, ${summary.totalSavedMB}MB saved`);

    return new Response(
      JSON.stringify({ summary, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Compression job failed:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        results 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
