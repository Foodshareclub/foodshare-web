/**
 * Storage API
 * File storage operations with Cloudflare R2 (primary) and Supabase Storage (fallback)
 *
 * Note: Image uploads now go through `imageAPI` from `@/api/imageAPI`.
 * This module handles download, delete, public URLs, and signed URLs.
 */

import { supabase } from "@/lib/supabase/client";
import { type StorageBucket } from "@/constants/storage";
import { deleteFromR2, isR2Configured, getR2PublicUrl } from "@/lib/r2/client";

// ============================================================================
// Types
// ============================================================================

export type ImageUrlType = {
  bucket: StorageBucket | string;
  path: string;
};

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
