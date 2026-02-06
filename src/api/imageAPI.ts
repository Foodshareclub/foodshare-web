/**
 * Image API Client
 *
 * Routes image uploads through the unified api-v1-images Edge Function.
 * Provides server-side compression, thumbnails, EXIF extraction, and AI detection.
 *
 * Replaces direct storageAPI.uploadImage() calls for image uploads.
 * storageAPI is still used for downloads, deletes, and signed URLs.
 */

import type {
  ImageUploadOptions,
  ImageUploadResponse,
  BatchUploadResponse,
  ImageAPIResult,
} from "./imageAPI.types";
import { supabase } from "@/lib/supabase/client";
import {
  classifyError,
  formatUploadError,
  calculateBackoffDelay,
  sleep,
  type UploadError,
} from "@/lib/upload";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const UPLOAD_ENDPOINT = `${SUPABASE_URL}/functions/v1/api-v1-images/upload`;
const BATCH_ENDPOINT = `${SUPABASE_URL}/functions/v1/api-v1-images/batch`;

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;
const TIMEOUT_MS = 60000; // 60s for server-side compression

/**
 * Get the current user's auth token (if available)
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Build FormData for a single image upload
 */
function buildFormData(file: File, options: ImageUploadOptions = {}): FormData {
  const formData = new FormData();
  formData.append("file", file);
  if (options.bucket) formData.append("bucket", options.bucket);
  if (options.path) formData.append("path", options.path);
  if (options.generateThumbnail === false) formData.append("generateThumbnail", "false");
  if (options.extractEXIF === false) formData.append("extractEXIF", "false");
  if (options.enableAI) formData.append("enableAI", "true");
  return formData;
}

/**
 * Execute a fetch with timeout and retry logic
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: UploadError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = calculateBackoffDelay(attempt - 1, {
        maxRetries: MAX_RETRIES,
        baseDelayMs: BASE_DELAY_MS,
        maxDelayMs: MAX_DELAY_MS,
        timeoutMs: TIMEOUT_MS,
      });
      await sleep(delay);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Non-OK response — classify the error
      const httpError = new Error(`HTTP ${response.status}`);
      lastError = classifyError(httpError, response);

      if (!lastError.retriable) break;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = classifyError(error);

      if (!lastError.retriable) break;
    }
  }

  throw lastError ?? { type: "unknown", message: "Upload failed", retriable: false };
}

export const imageAPI = {
  /**
   * Upload a single image through the Edge Function.
   *
   * Returns the public URL, thumbnail URL, and compression metadata.
   */
  async uploadImage(
    file: File,
    options: ImageUploadOptions = {}
  ): Promise<ImageAPIResult<ImageUploadResponse>> {
    try {
      const token = await getAuthToken();
      const formData = buildFormData(file, options);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetchWithRetry(UPLOAD_ENDPOINT, {
        method: "POST",
        headers,
        body: formData,
      });

      const json = await response.json();

      if (!json.success) {
        return { data: null, error: new Error(json.error || "Upload failed") };
      }

      return { data: json as ImageUploadResponse, error: null };
    } catch (error) {
      const uploadError = error as UploadError;
      const message = uploadError.type
        ? formatUploadError(uploadError)
        : error instanceof Error
          ? error.message
          : "Upload failed";
      return { data: null, error: new Error(message) };
    }
  },

  /**
   * Upload multiple images through the Edge Function batch endpoint.
   *
   * Calls the /batch endpoint which processes images sequentially server-side.
   * Falls back to sequential single uploads if /batch fails.
   */
  async uploadBatch(
    files: File[],
    options: ImageUploadOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<ImageAPIResult<BatchUploadResponse>> {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Build batch FormData
      const formData = new FormData();
      files.forEach((file, i) => formData.append(`file${i}`, file));
      if (options.bucket) formData.append("bucket", options.bucket);

      try {
        const response = await fetchWithRetry(BATCH_ENDPOINT, {
          method: "POST",
          headers,
          body: formData,
        });

        const json = await response.json();
        onProgress?.(files.length, files.length);
        return { data: json as BatchUploadResponse, error: null };
      } catch {
        // Batch endpoint failed — fall back to sequential single uploads
      }

      // Sequential fallback
      const results: ImageUploadResponse[] = [];
      let succeeded = 0;
      let failed = 0;
      let totalSavedBytes = 0;
      const startTime = Date.now();

      for (let i = 0; i < files.length; i++) {
        const result = await this.uploadImage(files[i], options);
        onProgress?.(i + 1, files.length);

        if (result.data) {
          results.push(result.data);
          succeeded++;
          totalSavedBytes += result.data.metadata.savedBytes;
        } else {
          failed++;
        }
      }

      const batchResponse: BatchUploadResponse = {
        success: failed === 0,
        results,
        summary: {
          total: files.length,
          succeeded,
          failed,
          totalSavedBytes,
          processingTime: Date.now() - startTime,
        },
      };

      if (failed > 0 && succeeded === 0) {
        return { data: null, error: new Error("All image uploads failed. Please try again.") };
      }

      return { data: batchResponse, error: null };
    } catch (error) {
      const uploadError = error as UploadError;
      const message = uploadError.type
        ? formatUploadError(uploadError)
        : error instanceof Error
          ? error.message
          : "Upload failed";
      return { data: null, error: new Error(message) };
    }
  },
};
