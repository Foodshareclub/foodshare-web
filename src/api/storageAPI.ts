/**
 * Storage API
 * Unified file storage with Cloudflare R2 (primary) and Supabase Storage (fallback)
 *
 * Features:
 * - R2 primary storage (zero egress fees, 10GB free)
 * - Automatic Supabase fallback on R2 failures
 * - Circuit breaker to skip R2 after repeated failures
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Comprehensive error classification
 */

import { supabase } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, validateFile, type StorageBucket } from "@/constants/storage";
import { deleteFromR2, isR2Configured, getR2PublicUrl } from "@/lib/r2/client";
import { getDirectUploadUrl } from "@/app/actions/storage";
import {
  isR2CircuitOpen,
  recordR2Failure,
  recordR2Success,
  classifyError,
  formatUploadError,
  sleep,
  calculateBackoffDelay,
  type UploadError,
  type RetryConfig,
} from "@/lib/upload";

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
  /** Optional retry configuration override */
  retryConfig?: Partial<RetryConfig>;
};

export type UploadResult = {
  path: string;
  publicUrl?: string;
  storage: "r2" | "supabase";
};

// ============================================================================
// Constants
// ============================================================================

/** Default upload configuration */
const UPLOAD_CONFIG: RetryConfig = {
  maxRetries: 2, // 2 retries = 3 total attempts
  baseDelayMs: 500,
  maxDelayMs: 5000,
  timeoutMs: 30000, // 30 seconds
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

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Perform a single upload attempt
 */
async function attemptUpload(
  url: string,
  file: File,
  headers: Record<string, string> | undefined,
  method: string,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; errorText?: string }> {
  const { controller, timeoutId } = createTimeoutController(timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: file,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return { ok: false, status: response.status, errorText };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);
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
   * Upload image to storage with robust error handling
   *
   * Features:
   * - R2 primary with automatic Supabase fallback
   * - Circuit breaker: skips R2 after repeated failures
   * - Retry logic with exponential backoff
   * - Timeout handling (30s default)
   * - Comprehensive error classification
   *
   * Flow:
   * 1. Check circuit breaker (skip R2 if open)
   * 2. Try R2 with retries
   * 3. On R2 failure: record failure, fallback to Supabase
   * 4. Try Supabase with retries
   * 5. Return success or user-friendly error
   */
  async uploadImage(
    params: UploadImageType
  ): Promise<{ data: UploadResult; error: null } | { data: null; error: Error }> {
    const { bucket, filePath, file, validate = true, retryConfig } = params;
    const config = { ...UPLOAD_CONFIG, ...retryConfig };

    const logPrefix = "[storageAPI.uploadImage]";

    console.log(`${logPrefix} 🚀 Starting upload:`, {
      bucket,
      filePath,
      size: file.size,
      type: file.type,
      r2CircuitOpen: isR2CircuitOpen(),
    });

    try {
      // ========================================
      // Step 1: Client-side validation
      // ========================================
      if (validate) {
        const bucketKey = getBucketKey(bucket);
        if (bucketKey) {
          const validation = validateFile(file, bucketKey);
          if (!validation.valid) {
            console.log(`${logPrefix} ❌ Validation failed:`, validation.error);
            return { data: null, error: new Error(validation.error) };
          }
        }
      }

      // ========================================
      // Step 2: Get upload URL and perform upload
      // ========================================
      type UploadAttemptResult = {
        success: boolean;
        storage: "r2" | "supabase";
        error?: UploadError;
        errorMessage?: string;
      };

      /**
       * Attempt upload to a specific storage with retries
       */
      const attemptStorageUpload = async (forceSupabase: boolean): Promise<UploadAttemptResult> => {
        const storageType = forceSupabase ? "supabase" : "r2";

        // Get presigned URL from server
        console.log(`${logPrefix} 🌐 Getting ${storageType} upload URL...`);

        const directUpload = await getDirectUploadUrl(
          bucket,
          filePath,
          file.type,
          file.size,
          forceSupabase
        );

        if (!directUpload.success || !directUpload.url) {
          return {
            success: false,
            storage: directUpload.storage || "supabase",
            errorMessage: directUpload.error || "Failed to get upload URL",
          };
        }

        const actualStorage = directUpload.storage || "supabase";
        console.log(`${logPrefix} 📤 Uploading to ${actualStorage}...`);

        // Retry loop
        let lastError: UploadError | undefined;

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = calculateBackoffDelay(attempt - 1, config);
              console.log(
                `${logPrefix} 🔄 Retry ${attempt}/${config.maxRetries} for ${actualStorage}, ` +
                  `waiting ${Math.round(delay)}ms...`
              );
              await sleep(delay);
            }

            const result = await attemptUpload(
              directUpload.url,
              file,
              directUpload.uploadHeaders,
              directUpload.method || "PUT",
              config.timeoutMs
            );

            if (result.ok) {
              console.log(`${logPrefix} ✅ Upload successful via ${actualStorage}`);
              return { success: true, storage: actualStorage };
            }

            // HTTP error - classify it
            const httpError = new Error(`HTTP ${result.status}: ${result.errorText}`);
            lastError = classifyError(httpError, { status: result.status } as Response);

            console.log(
              `${logPrefix} ⚠️ Attempt ${attempt + 1} failed:`,
              lastError.type,
              lastError.message
            );

            // Don't retry non-retriable errors
            if (!lastError.retriable) {
              break;
            }
          } catch (fetchError) {
            // Network/CORS/timeout error
            lastError = classifyError(fetchError);

            console.log(
              `${logPrefix} ⚠️ Attempt ${attempt + 1} exception:`,
              lastError.type,
              lastError.message
            );

            // CORS errors won't fix themselves with retries
            if (lastError.type === "cors") {
              break;
            }

            // Don't retry non-retriable errors
            if (!lastError.retriable) {
              break;
            }
          }
        }

        return {
          success: false,
          storage: actualStorage,
          error: lastError,
          errorMessage: lastError?.message || "Upload failed after retries",
        };
      };

      // ========================================
      // Step 3: Try R2 first (unless circuit is open)
      // ========================================
      let result: UploadAttemptResult;

      if (isR2CircuitOpen()) {
        console.log(`${logPrefix} ⚡ R2 circuit open, skipping to Supabase`);
        result = await attemptStorageUpload(true);
      } else {
        // Try R2
        result = await attemptStorageUpload(false);

        // ========================================
        // Step 4: Fallback to Supabase if R2 failed
        // ========================================
        if (!result.success && result.storage === "r2") {
          // Record R2 failure for circuit breaker
          recordR2Failure();

          const failureReason = result.error?.type || "unknown";
          console.log(`${logPrefix} 🔄 R2 failed (${failureReason}), falling back to Supabase...`);

          // Try Supabase
          result = await attemptStorageUpload(true);
        } else if (result.success && result.storage === "r2") {
          // Record R2 success (resets circuit breaker)
          recordR2Success();
        }
      }

      // ========================================
      // Step 5: Return result
      // ========================================
      if (!result.success) {
        // Format user-friendly error message
        const userMessage = result.error
          ? formatUploadError(result.error)
          : result.errorMessage || "Upload failed. Please try again.";

        console.error(`${logPrefix} ❌ All upload attempts failed:`, userMessage);
        return { data: null, error: new Error(userMessage) };
      }

      return {
        data: {
          path: result.storage === "r2" ? `${bucket}/${filePath}` : filePath,
          storage: result.storage,
          publicUrl: undefined,
        },
        error: null,
      };
    } catch (error) {
      // Unexpected error (shouldn't happen, but be safe)
      console.error(`${logPrefix} ❌ Unexpected exception:`, error);
      return {
        data: null,
        error: new Error("An unexpected error occurred. Please try again."),
      };
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
