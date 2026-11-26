/**
 * Storage URL Validation
 *
 * Validates that image URLs belong to our own storage providers
 * (VPS-backed Supabase Storage). Used by api-v1-products
 * to reject external image URLs and by cleanup-orphan-images
 * to parse storage paths for deletion.
 *
 * @module _shared/storage-urls
 */

import { validateImageUrl } from "./url-validation.ts";
import { STORAGE_BUCKETS } from "./storage-constants.ts";
import { getSecret } from "./vault.ts";
import { downloadImage } from "./image-utils.ts";

export interface ParsedStorageUrl {
  provider: "supabase" | "r2";
  bucket: string;
  path: string;
}

// The image processor also accepts its existing food-images bucket alias.
const VALID_BUCKETS = new Set<string>([...Object.values(STORAGE_BUCKETS), "food-images"]);

/**
 * Parse a URL into its storage provider, bucket, and path components.
 * Returns null if the URL doesn't match any known storage pattern.
 *
 * Supabase pattern: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
 */
export async function parseStorageUrl(
  url: string,
): Promise<ParsedStorageUrl | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // Check Supabase Storage pattern
  const supabaseUrl = Deno.env.get("SUPABASE_PUBLIC_URL") ||
    Deno.env.get("API_EXTERNAL_URL") || await getSecret("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      const supabaseOrigin = new URL(supabaseUrl).origin;
      if (
        parsed.origin === supabaseOrigin && !parsed.username && !parsed.password
      ) {
        // Pattern: /storage/v1/object/public/{bucket}/{...path}
        const match = parsed.pathname.match(
          /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/,
        );
        if (match) {
          const [, bucket, path] = match;
          if (VALID_BUCKETS.has(bucket)) {
            return { provider: "supabase", bucket, path };
          }
        }
      }
    } catch {
      // Invalid SUPABASE_URL — skip
    }
  }

  return null;
}

/**
 * Check whether a URL points to our primary Supabase storage.
 */
export async function isOwnStorageUrl(url: string): Promise<boolean> {
  return (await parseStorageUrl(url)) !== null;
}

/**
 * Validate that all product image URLs are safe (SSRF) AND belong to our storage.
 *
 * Returns a discriminated union so callers get the list of offending URLs
 * for a meaningful error message.
 */
export async function validateProductImageUrls(
  urls: string[],
  readback: (url: string) => Promise<Uint8Array> = downloadImage,
): Promise<{ valid: true } | { valid: false; invalidUrls: string[] }> {
  const invalidUrls: string[] = [];

  for (const url of urls) {
    // First: SSRF / general safety check
    const ssrfResult = validateImageUrl(url);
    if (!ssrfResult.valid) {
      invalidUrls.push(url);
      continue;
    }

    // Second: must belong to our storage
    if (!(await isOwnStorageUrl(url))) {
      invalidUrls.push(url);
    }
  }

  if (invalidUrls.length > 0) {
    return { valid: false, invalidUrls };
  }

  // An owned URL is not proof that its public object exists. Check the primary
  // photo before publishing; never replace a user's upload with a generated one.
  if (urls[0]) {
    try {
      if (!isListingPhoto(await readback(urls[0]))) {
        return { valid: false, invalidUrls: [urls[0]] };
      }
    } catch {
      return { valid: false, invalidUrls: [urls[0]] };
    }
  }

  return { valid: true };
}

/** Accept the raster families supported by the existing listing upload API. */
function isListingPhoto(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || bytes.length > 10 * 1024 * 1024) return false;
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) return true;
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return true;
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return true;
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return true;
  if (ascii(4, 8) === "ftyp") {
    const boxSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
    if (boxSize < 16 || boxSize > bytes.length || boxSize > 4096) return false;
    const brands = new Set(["avif", "avis", "heic", "heix", "hevc", "hevx", "mif1", "msf1"]);
    if (brands.has(ascii(8, 12))) return true;
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
      if (brands.has(ascii(offset, offset + 4))) return true;
    }
  }
  return false;
}
