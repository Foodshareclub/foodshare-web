/** Primary Supabase image upload shared by image and partner-sync functions. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ServerError } from "./errors.ts";
import { storagePublicUrl } from "./storage-public-url.ts";

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

  const generated = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const publicUrl = storagePublicUrl(
    Deno.env.get("SUPABASE_PUBLIC_URL") || Deno.env.get("API_EXTERNAL_URL") ||
      generated,
    bucket,
    path,
  );
  return { publicUrl, storage: "supabase" };
}
