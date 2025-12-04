/**
 * Storage API
 * Handles file upload/download operations with Supabase Storage
 */

import { supabase } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, validateFile, type StorageBucket } from "@/constants/storage";

export type ImageUrlType = {
  bucket: StorageBucket | string;
  path: string;
};

export type UploadImageType = {
  bucket: StorageBucket | string;
  filePath: string;
  file: File;
  validate?: boolean; // Enable validation (default: true)
};

/**
 * Storage API methods
 * Separated from profile API for clean architecture
 */
export const storageAPI = {
  /**
   * Download image from storage
   */
  async downloadImage(
    params: ImageUrlType
  ): Promise<{ data: Blob; error: null } | { data: null; error: Error }> {
    try {
      const { data, error } = await supabase.storage.from(params.bucket).download(params.path);

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Upload image to storage
   * Validates file type and size before upload
   */
  async uploadImage(
    params: UploadImageType
  ): Promise<{ data: { path: string }; error: null } | { data: null; error: Error }> {
    try {
      // Validate file if validation is enabled (default: true)
      if (params.validate !== false) {
        const bucketKey = Object.keys(STORAGE_BUCKETS).find(
          (key) => STORAGE_BUCKETS[key as keyof typeof STORAGE_BUCKETS] === params.bucket
        ) as keyof typeof STORAGE_BUCKETS | undefined;

        if (bucketKey) {
          const validation = validateFile(params.file, bucketKey);
          if (!validation.valid) {
            return { data: null, error: new Error(validation.error) };
          }
        }
      }

      const { data, error } = await supabase.storage
        .from(params.bucket)
        .upload(params.filePath, params.file, { upsert: true });

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  /**
   * Delete image from storage
   */
  async deleteImage(params: ImageUrlType): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.storage.from(params.bucket).remove([params.path]);

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  },

  /**
   * Get public URL for an image
   */
  getPublicUrl(params: ImageUrlType): string {
    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    return data.publicUrl;
  },

  /**
   * Create signed URL for private images
   */
  async createSignedUrl(
    params: ImageUrlType,
    expiresIn: number = 3600
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(params.bucket)
        .createSignedUrl(params.path, expiresIn);

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};

// Legacy exports for backward compatibility
export type ImgUrlType = ImageUrlType;
export type UploadImgUrlType = UploadImageType;
export const downloadImgFromDB = storageAPI.downloadImage;
export const uploadImgFromDB = storageAPI.uploadImage;
