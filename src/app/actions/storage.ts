"use server";

/**
 * Server Action for file uploads
 * Handles R2 uploads server-side where Vault credentials are accessible
 */

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS, validateFile } from "@/constants/storage";
import { uploadToR2, getR2Secrets, getPresignedUpload } from "@/lib/r2";

const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Conditional logging - only logs in development
 */
function devLog(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`[Storage] ${message}${dataStr}`);
}

function devWarn(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.warn(`[Storage] ${message}${dataStr}`);
}

export type UploadResult = {
  success: boolean;
  path?: string;
  publicUrl?: string;
  storage?: "r2" | "supabase";
  error?: string;
};

export type DirectUploadResult = {
  success: boolean;
  url?: string;
  uploadHeaders?: Record<string, string>;
  method?: string;
  storage?: "r2" | "supabase";
  error?: string;
};

/**
 * Upload a file to R2 storage (server-side)
 * This action runs on the server where Vault credentials are accessible
 */
export async function uploadToStorage(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file") as File | null;
  const bucket = formData.get("bucket") as string;
  const filePath = formData.get("filePath") as string;
  const skipValidation = formData.get("skipValidation") === "true";

  if (!file || !bucket || !filePath) {
    return { success: false, error: "Missing required fields" };
  }

  devLog("🚀 Starting upload", { bucket, filePath, size: file.size, type: file.type });

  try {
    // Validate file if not skipped
    if (!skipValidation) {
      const bucketKey = Object.keys(STORAGE_BUCKETS).find(
        (key) => STORAGE_BUCKETS[key as keyof typeof STORAGE_BUCKETS] === bucket
      ) as keyof typeof STORAGE_BUCKETS | undefined;

      if (bucketKey) {
        const validation = validateFile(file, bucketKey);
        if (!validation.valid) {
          devLog("❌ Validation failed", validation.error);
          return { success: false, error: validation.error };
        }
      }
    }

    // Get R2 config from Vault
    const r2Config = await getR2Secrets();

    if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
      devLog("📤 Uploading to R2...");
      const r2Path = `${bucket}/${filePath}`;
      const result = await uploadToR2(file, r2Path, file.type);

      if (result.success && result.path) {
        devLog("✅ R2 upload successful", result.publicUrl);
        return {
          success: true,
          path: result.path,
          publicUrl: result.publicUrl,
          storage: "r2",
        };
      }

      devWarn("⚠️ R2 failed", result.error);
    } else {
      devWarn("⚠️ R2 not configured, falling back to Supabase");
    }

    // Fallback to Supabase direct upload using service role key (server-side)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return { success: false, error: "Storage not configured" };
    }

    devLog("📤 Uploading to Supabase...");
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "x-upsert": "true",
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Storage] ❌ Supabase upload failed:", response.status, errorText);
      return { success: false, error: `Upload failed: ${response.status}` };
    }

    const result = await response.json();
    devLog("✅ Supabase upload successful");

    // Construct public URL for Supabase storage
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

    return {
      success: true,
      path: result.Key || filePath,
      publicUrl,
      storage: "supabase",
    };
  } catch (error) {
    console.error("[Storage] ❌ Exception:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Get a direct upload URL for client-side upload
 * Bypasses server bandwidth and timeouts
 *
 * @param bucket - Storage bucket name
 * @param filePath - Path within the bucket
 * @param fileType - MIME type
 * @param fileSize - File size in bytes
 * @param forceSupabase - Skip R2 and use Supabase directly (for CORS fallback)
 */
export async function getDirectUploadUrl(
  bucket: string,
  filePath: string,
  fileType: string,
  fileSize: number,
  forceSupabase: boolean = false
): Promise<DirectUploadResult> {
  devLog("🚀 Getting direct upload URL", {
    bucket,
    filePath,
    size: fileSize,
    type: fileType,
    forceSupabase,
  });

  try {
    // Try R2 first (unless forced to use Supabase)
    if (!forceSupabase) {
      const r2Config = await getR2Secrets();

      if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
        const presigned = await getPresignedUpload(`${bucket}/${filePath}`, fileType, fileSize);

        if (presigned) {
          devLog("✅ Generated R2 presigned URL");
          return {
            success: true,
            url: presigned.url,
            uploadHeaders: presigned.headers,
            method: "PUT",
            storage: "r2",
          };
        }
      }
    }

    // Fallback to Supabase (or forced)
    devLog(forceSupabase ? "🔄 Using Supabase (forced)" : "⚠️ R2 not configured, using Supabase");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[Storage] ❌ Missing Supabase admin credentials");
      return { success: false, error: "Storage configuration error" };
    }

    // Use admin client to bypass RLS for signed URL generation
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      console.error("[Storage] ❌ Supabase presign failed:", error);
      return { success: false, error: error?.message || "Failed to generate upload URL" };
    }

    devLog("✅ Generated Supabase upload URL");
    return {
      success: true,
      url: data.signedUrl,
      method: "PUT",
      uploadHeaders: {
        "x-upsert": "true",
      },
      storage: "supabase",
    };
  } catch (error) {
    console.error("[Storage] ❌ Exception:", error);
    return { success: false, error: (error as Error).message };
  }
}
