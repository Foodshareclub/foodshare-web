import { storagePublicUrl } from "../../_shared/storage-public-url.ts";
/**
 * Image storage utilities — rate limiting and primary VPS-backed Supabase uploads.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../../_shared/logger.ts";
import { ServerError } from "../../_shared/errors.ts";

export const ALLOWED_BUCKETS = [
  "food-images",
  "profiles",
  "forum",
  "challenges",
  "rooms",
  "assets",
  "avatars",
  "posts",
];

/**
 * Buckets a normal account may write to. `assets` holds shared templates and
 * other deployment-owned files; a client upload must never be able to replace
 * `templates/confirmation.html` and change what an auth email links to.
 */
export const CLIENT_WRITABLE_BUCKETS = ALLOWED_BUCKETS.filter(
  (bucket) => bucket !== "assets",
);

export function isClientWritableBucket(bucket: string): boolean {
  return CLIENT_WRITABLE_BUCKETS.includes(bucket);
}

/**
 * Put every client object under the caller's own prefix.
 *
 * `customPath` used to be passed through to storage, so one account could
 * overwrite another account's image (or a shared template) by naming its path.
 * The prefix is the object-level ownership boundary that storage policies and
 * the public URL both rely on.
 */
export function scopedUploadPath(
  userId: string,
  customPath: string | null | undefined,
  format: string,
): string {
  const randomName = `${crypto.randomUUID()}.${format}`;
  if (!customPath) return `${userId}/${randomName}`;

  const normalized = customPath.trim().replace(/^\/+/, "");
  const safe = normalized.length > 0 &&
    normalized.length <= 200 &&
    !normalized.includes("..") &&
    !normalized.includes("\\") &&
    /^[A-Za-z0-9._/-]+$/.test(normalized);

  if (!safe) return `${userId}/${randomName}`;

  // Force the extension to the detected format, so a path ending in `.html`
  // is still stored as an image and served with an image content type.
  const withoutExtension = normalized.replace(/\.[^./]+$/, "");
  if (withoutExtension.startsWith(`${userId}/`)) {
    return `${withoutExtension}.${format}`;
  }
  return `${userId}/${withoutExtension}.${format}`;
}

// Rate limiting: 100 uploads per user per day.
//
// The read-modify-write version on `user_rate_limits` let N concurrent uploads
// all read the same count and each write count+1, so a burst could exceed the
// limit by the number of concurrent requests. The RPC performs the increment
// under a row lock and returns the post-increment decision.
// deno-lint-ignore no-explicit-any
export async function checkRateLimit(
  userId: string,
  supabase: SupabaseClient<any, any, any>,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_image_upload_quota", {
    p_user_id: userId,
  });

  if (error) {
    // Fail closed: an unavailable limiter must not become an unlimited one.
    logger.error("Image upload quota check failed", new Error(error.message));
    return false;
  }

  return data === true;
}

export async function uploadImage(
  // deno-lint-ignore no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  bucket: string,
  path: string,
  buffer: Uint8Array,
  contentType: string,
): Promise<{ publicUrl: string; storage: "supabase" }> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    throw new ServerError(`Upload failed: ${uploadError.message}`);
  }

  const generated =
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const publicUrl = storagePublicUrl(
    Deno.env.get("SUPABASE_PUBLIC_URL") || Deno.env.get("API_EXTERNAL_URL") ||
      generated,
    bucket,
    path,
  );
  return { publicUrl, storage: "supabase" };
}
