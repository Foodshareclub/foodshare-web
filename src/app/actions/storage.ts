"use server";

/**
 * Server Action for file uploads
 * Handles R2 uploads server-side where Vault credentials are accessible
 */

import {
  STORAGE_BUCKETS,
  validateFile,
  type StorageBucket as _StorageBucket,
} from "@/constants/storage";
import { uploadToR2, getR2Secrets } from "@/lib/r2";

export type UploadResult = {
  success: boolean;
  path?: string;
  publicUrl?: string;
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

  console.log("[Storage Action] 🚀 Starting upload:", {
    bucket,
    filePath,
    size: file.size,
    type: file.type,
  });

  try {
    // Validate file if not skipped
    if (!skipValidation) {
      const bucketKey = Object.keys(STORAGE_BUCKETS).find(
        (key) => STORAGE_BUCKETS[key as keyof typeof STORAGE_BUCKETS] === bucket
      ) as keyof typeof STORAGE_BUCKETS | undefined;

      if (bucketKey) {
        const validation = validateFile(file, bucketKey);
        if (!validation.valid) {
          console.log("[Storage Action] ❌ Validation failed:", validation.error);
          return { success: false, error: validation.error };
        }
      }
    }

    // Get R2 config from Vault
    const r2Config = await getR2Secrets();

    if (r2Config.accountId && r2Config.accessKeyId && r2Config.secretAccessKey) {
      console.log("[Storage Action] 📤 Uploading to R2...");
      const r2Path = `${bucket}/${filePath}`;
      const result = await uploadToR2(file, r2Path, file.type);

      if (result.success && result.path) {
        console.log("[Storage Action] ✅ R2 upload successful:", result.publicUrl);
        return {
          success: true,
          path: result.path,
          publicUrl: result.publicUrl,
          storage: "r2",
        };
      }

      console.warn("[Storage Action] ⚠️ R2 failed:", result.error);
    } else {
      console.warn("[Storage Action] ⚠️ R2 not configured, falling back to Supabase");
    }

    // Fallback to Supabase direct upload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "Storage not configured" };
    }

    console.log("[Storage Action] 📤 Uploading to Supabase...");
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        "x-upsert": "true",
      },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Storage Action] ❌ Supabase upload failed:", response.status, errorText);
      return { success: false, error: `Upload failed: ${response.status}` };
    }

    const result = await response.json();
    console.log("[Storage Action] ✅ Supabase upload successful");

    return {
      success: true,
      path: result.Key || filePath,
      storage: "supabase",
    };
  } catch (error) {
    console.error("[Storage Action] ❌ Exception:", error);
    return { success: false, error: (error as Error).message };
  }
}
