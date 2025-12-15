/**
 * Storage API
 * Unified file storage with Cloudflare R2 (primary) and Supabase Storage (fallback)
 *
 * R2 provides zero egress fees and 10GB free storage
 * Supabase is used as fallback when R2 is not configured
 */

import { supabase } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, validateFile, type StorageBucket } from "@/constants/storage";
import { uploadToR2, deleteFromR2, isR2Configured, getR2PublicUrl } from "@/lib/r2/client";

// ============================================================================
// Types
// ============================================================================

export type ImageUrlType = {
  bucket: StorageBucket | string;
  path: string;
};

export type UploadImageType = {
  bucket: StorageBucket | string;
  filePath: string;
  file: File;
  validate?: boolean;
};

export type UploadResult = {
  path: string;
  publicUrl?: string;
  storage: "r2" | "supabase";
};

// ============================================================================
// Constants
// ============================================================================

const UPLOAD_TIMEOUT_MS = 30000;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get bucket key from bucket name for validation
 */
function getBucketKey(bucket: string): keyof typeof STORAGE_BUCKETS | undefined {
  return Object.keys(STORAGE_BUCKETS).find(
    (key) => STORAGE_BUCKETS[key as keyof typeof STORAGE_BUCKETS] === bucket
  ) as keyof typeof STORAGE_BUCKETS | undefined;
}

/**
 * Upload to Supabase Storage using direct fetch (bypasses auth issues)
 */
async function uploadToSupabase(
  bucket: string,
  filePath: string,
  file: File
): Promise<{ path: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase configuration missing");
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "x-upsert": "true",
      },
      body: file,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return { path: result.Key || filePath };
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
}

// ============================================================================
// Storage API
// ============================================================================

export const storageAPI = {
  /**
   * Download image from Supabase storage
   */
  async downloadImage(
    params: ImageUrlType
  ): Promise<{ data: Blob; error: null } | { data: null; error: Error }> {
    try {
      const { data, error } = await supabase.storage.from(params.bucket).download(params.path);

      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Upload image to storage
   * Uses R2 as primary (if configured), falls back to Supabase
   */
  async uploadImage(
    params: UploadImageType
  ): Promise<{ data: UploadResult; error: null } | { data: null; error: Error }> {
    const { bucket, filePath, file, validate = true } = params;

    console.log("[Storage] 🚀 Starting upload:", {
      bucket,
      filePath,
      size: file.size,
      type: file.type,
    });

    try {
      // Validate file if enabled
      if (validate) {
        const bucketKey = getBucketKey(bucket);
        if (bucketKey) {
          const validation = validateFile(file, bucketKey);
          if (!validation.valid) {
            console.log("[Storage] ❌ Validation failed:", validation.error);
            return { data: null, error: new Error(validation.error) };
          }
        }
      }

      // Try R2 first (primary storage)
      if (isR2Configured()) {
        console.log("[Storage] 📤 Uploading to R2...");
        const r2Path = `${bucket}/${filePath}`;
        const result = await uploadToR2(file, r2Path, file.type);

        if (result.success && result.path) {
          console.log("[Storage] ✅ R2 upload successful");
          return {
            data: {
              path: result.path,
              publicUrl: result.publicUrl,
              storage: "r2",
            },
            error: null,
          };
        }

        console.warn("[Storage] ⚠️ R2 failed, falling back to Supabase:", result.error);
      }

      // Fallback to Supabase
      console.log("[Storage] 📤 Uploading to Supabase...");
      const supabaseResult = await uploadToSupabase(bucket, filePath, file);

      if (supabaseResult) {
        console.log("[Storage] ✅ Supabase upload successful");
        return {
          data: {
            path: supabaseResult.path,
            storage: "supabase",
          },
          error: null,
        };
      }

      return { data: null, error: new Error("Upload failed") };
    } catch (error) {
      console.error("[Storage] ❌ Upload error:", error);
      return { data: null, error: error as Error };
    }
  },

  /**
   * Delete image from storage
   * Attempts to delete from both R2 and Supabase
   */
  async deleteImage(params: ImageUrlType): Promise<{ error: Error | null }> {
    const errors: string[] = [];

    // Try R2 first
    if (isR2Configured()) {
      const r2Path = `${params.bucket}/${params.path}`;
      const r2Result = await deleteFromR2(r2Path);
      if (!r2Result.success && r2Result.error) {
        errors.push(`R2: ${r2Result.error}`);
      }
    }

    // Also delete from Supabase (for migration period)
    try {
      const { error } = await supabase.storage.from(params.bucket).remove([params.path]);
      if (error) {
        errors.push(`Supabase: ${error.message}`);
      }
    } catch (error) {
      errors.push(`Supabase: ${(error as Error).message}`);
    }

    // Return error only if both failed
    if (errors.length === 2) {
      return { error: new Error(errors.join("; ")) };
    }

    return { error: null };
  },

  /**
   * Get public URL for an image
   * Checks R2 first, falls back to Supabase
   */
  getPublicUrl(params: ImageUrlType): string {
    // If R2 is configured, use R2 URL format
    if (isR2Configured()) {
      return getR2PublicUrl(`${params.bucket}/${params.path}`);
    }

    // Fallback to Supabase
    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    return data.publicUrl;
  },

  /**
   * Create signed URL for private images (Supabase only)
   */
  async createSignedUrl(
    params: ImageUrlType,
    expiresIn: number = 3600
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(params.bucket)
        .createSignedUrl(params.path, expiresIn);

      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};

// ============================================================================
// Legacy Exports (backward compatibility)
// ============================================================================

export type ImgUrlType = ImageUrlType;
export type UploadImgUrlType = UploadImageType;
export const downloadImgFromDB = storageAPI.downloadImage;
export const uploadImgFromDB = storageAPI.uploadImage;
