/**
 * Storage API
 * File storage operations on primary VPS-backed Supabase Storage
 *
 * Note: Image uploads now go through `imageAPI` from `@/api/imageAPI`.
 * This module handles download, delete, public URLs, and signed URLs.
 */

import type { StorageBucket } from "@/constants/storage";
import { supabase } from "@/lib/supabase/client";

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
  async downloadImage(params: ImageUrlType): Promise<{ data: Blob; error: null } | { data: null; error: Error }> {
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
   * Deletes only the requested primary Supabase object
   */
  async deleteImage(params: ImageUrlType): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.storage.from(params.bucket).remove([params.path]);
      return { error };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  /**
   * Get public URL for an image
   * Uses the primary Supabase Storage URL
   */
  getPublicUrl(params: ImageUrlType): string {
    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    return data.publicUrl;
  },

  /**
   * Create signed URL for private images (Supabase only)
   */
  async createSignedUrl(
    params: ImageUrlType,
    expiresIn = 3600,
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage.from(params.bucket).createSignedUrl(params.path, expiresIn);

      if (error) return { data: null, error };
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};
