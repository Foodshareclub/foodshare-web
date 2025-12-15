/**
 * Storage API
 * Unified file storage with Cloudflare R2 (primary) and Supabase Storage (fallback)
 *
 * R2 provides zero egress fees and 10GB free storage
 * Uses Server Action for uploads to access Vault credentials
 */

import { supabase } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, validateFile, type StorageBucket } from "@/constants/storage";
import { deleteFromR2, isR2Configured, getR2PublicUrl } from "@/lib/r2/client";
import { getDirectUploadUrl } from "@/app/actions/storage";

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
   * Upload image to storage via Server Action
   * Uses R2 as primary (credentials from Vault), falls back to Supabase
   */
  /**
   * Upload image to storage
   * Uses direct client-side upload (presigned URL) for performance
   * Bypasses Next.js Server Action limits and timeouts
   */
  async uploadImage(
    params: UploadImageType
  ): Promise<{ data: UploadResult; error: null } | { data: null; error: Error }> {
    const { bucket, filePath, file, validate = true } = params;

    console.log("[storageAPI.uploadImage] 🚀 Starting upload:", {
      bucket,
      filePath,
      size: file.size,
      type: file.type,
    });

    try {
      // Client-side validation first (fast feedback)
      if (validate) {
        const bucketKey = getBucketKey(bucket);
        if (bucketKey) {
          const validation = validateFile(file, bucketKey);
          if (!validation.valid) {
            console.log("[storageAPI.uploadImage] ❌ Validation failed:", validation.error);
            return { data: null, error: new Error(validation.error) };
          }
        }
      }

      // Get direct upload URL from server
      console.log("[storageAPI.uploadImage] 🌐 Getting direct upload URL...");
      const directUpload = await getDirectUploadUrl(bucket, filePath, file.type, file.size);

      if (!directUpload.success || !directUpload.url) {
        throw new Error(directUpload.error || "Failed to get upload configuration");
      }

      // Perform direct upload
      console.log(`[storageAPI.uploadImage] 📤 Uploading to ${directUpload.storage}...`);

      const response = await fetch(directUpload.url, {
        method: directUpload.method || "PUT",
        headers: directUpload.uploadHeaders,
        body: file,
      });

      if (!response.ok) {
        // R2/S3 usually return XML error, Supabase might return JSON
        const errorText = await response.text();
        console.error(`[storageAPI.uploadImage] ❌ Upload failed (${response.status}):`, errorText);
        throw new Error(`Upload failed with status ${response.status}`);
      }

      console.log(`[storageAPI.uploadImage] ✅ Upload successful via ${directUpload.storage}`);

      return {
        data: {
          path: directUpload.storage === "r2" ? `${bucket}/${filePath}` : filePath,
          storage: directUpload.storage || "supabase",
          // We can't easily get the public URL immediately for R2 without config on client
          // But consumers often construct it or use path.
          publicUrl: undefined,
        },
        error: null,
      };
    } catch (error) {
      console.error("[storageAPI.uploadImage] ❌ Exception:", error);
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
