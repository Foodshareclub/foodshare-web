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

  return { valid: true };
}
