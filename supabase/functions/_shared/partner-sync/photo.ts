/**
 * Partner photos follow their Airtable.
 *
 * Airtable attachment URLs expire, so a record's photo is downloaded through
 * the same SSRF-gated fetch the cover pipeline uses and re-hosted in the
 * listings bucket (`posts`) under the listing owner's `partner-lacf/`
 * namespace. That namespace belongs to this sync alone, so a replaced or
 * cleared photo can be removed safely; the cover pipeline's shared
 * content-addressed objects are never touched.
 *
 * A record with no photo clears ours. A failed download is NOT an empty
 * record: it throws, and the caller keeps the current photo for a later run.
 *
 * @module _shared/partner-sync/photo
 */

import { ServerError } from "../errors.ts";
import { STORAGE_BUCKETS } from "../storage-constants.ts";

/** The Airtable attachment fields the sync fingerprints. */
export interface PartnerPhotoSource {
  attachment_id: string;
  filename: string;
  size: number | null;
  url: string;
}

/** What we store on the listing once the bytes are ours. */
export interface StoredPartnerPhoto {
  attachment_id: string;
  filename: string;
  size: number | null;
  sha256: string;
  url: string;
  stored_at: string;
}

export interface PartnerPhotoDeps {
  download(url: string): Promise<Uint8Array>;
  store(path: string, bytes: Uint8Array, contentType: string): Promise<string>;
  readback(url: string): Promise<Uint8Array>;
}

export interface PartnerPhotoInput {
  ownerId: string;
  attachment: PartnerPhotoSource | null;
  currentImages: string[];
  stored: StoredPartnerPhoto | null;
}

export interface PartnerPhotoResult {
  images: string[];
  photo: StoredPartnerPhoto | null;
  /** The previous sync-owned object, when this run replaced or cleared it. */
  replacedUrl: string | null;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // posts bucket limit
const MIN_PHOTO_BYTES = 1_000;
const PARTNER_PREFIX = "/partner-lacf/";

export function isPartnerPhotoUrl(url: string): boolean {
  return typeof url === "string" && url.includes(PARTNER_PREFIX);
}

function detectRaster(bytes: Uint8Array): "jpeg" | "png" | "webp" | "gif" {
  if (bytes.length < MIN_PHOTO_BYTES) {
    throw new ServerError("Partner photo is too small to be a usable cover");
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    throw new ServerError("Partner photo exceeds the 10MB listing limit");
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) return "png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(0, 4) === "GIF8") return "gif";
  throw new ServerError("Partner photo is not a supported raster image");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}

export function partnerPhotoPath(
  ownerId: string,
  digest: string,
  format: string,
): string {
  return `${ownerId}/partner-lacf/${digest}.${format}`;
}

/** True when the attachment is the same upload we already stored. */
function sameAttachment(
  source: PartnerPhotoSource,
  stored: StoredPartnerPhoto | null,
): boolean {
  if (!stored) return false;
  if (stored.attachment_id && source.attachment_id) {
    if (stored.attachment_id !== source.attachment_id) return false;
  } else if (stored.filename !== source.filename) {
    return false;
  }
  if (
    source.size !== null && stored.size !== null && source.size !== stored.size
  ) return false;
  return stored.url.length > 0;
}

export async function resolvePartnerPhoto(
  input: PartnerPhotoInput,
  deps: PartnerPhotoDeps,
): Promise<PartnerPhotoResult> {
  const previous = input.stored?.url ??
    input.currentImages.find((url) => isPartnerPhotoUrl(url)) ?? null;

  if (!input.attachment) {
    return { images: [], photo: null, replacedUrl: previous };
  }

  if (sameAttachment(input.attachment, input.stored) && input.stored) {
    return {
      images: [input.stored.url],
      photo: input.stored,
      replacedUrl: previous && previous !== input.stored.url ? previous : null,
    };
  }

  const bytes = await deps.download(input.attachment.url);
  const format = detectRaster(bytes);
  const digest = await sha256Hex(bytes);
  const path = partnerPhotoPath(input.ownerId, digest, format);
  const url = await deps.store(path, bytes, `image/${format}`);

  const readback = await deps.readback(url);
  if ((await sha256Hex(readback)) !== digest) {
    throw new ServerError("Partner photo public readback verification failed");
  }

  return {
    images: [url],
    photo: {
      attachment_id: input.attachment.attachment_id,
      filename: input.attachment.filename,
      size: input.attachment.size,
      sha256: digest,
      url,
      stored_at: new Date().toISOString(),
    },
    replacedUrl: previous && previous !== url ? previous : null,
  };
}

/** The object path of a public listings URL under the partner namespace. */
export function partnerObjectPath(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const marker = `/storage/v1/object/public/${STORAGE_BUCKETS.POSTS}/`;
  const at = parsed.pathname.indexOf(marker);
  if (at === -1) return null;
  const path = decodeURIComponent(parsed.pathname.slice(at + marker.length));
  if (!path.includes(PARTNER_PREFIX.slice(1))) return null;
  return path;
}

/**
 * Remove a sync-owned object once nothing references it. Shared cover objects
 * (any path outside `partner-lacf/`) are never deleted here.
 */
export async function removePartnerPhoto(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  url: string,
): Promise<boolean> {
  const path = partnerObjectPath(url);
  if (!path) return false;
  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .contains("images", [url])
    .limit(1);
  if (error) {
    throw new ServerError(
      `Partner photo reference check failed: ${error.message}`,
    );
  }
  if (Array.isArray(data) && data.length > 0) return false;
  const { error: removeError } = await supabase.storage
    .from(STORAGE_BUCKETS.POSTS)
    .remove([path]);
  if (removeError) {
    throw new ServerError(
      `Partner photo cleanup failed: ${removeError.message}`,
    );
  }
  return true;
}
