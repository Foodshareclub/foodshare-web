/**
 * Reference-cover provenance written by the backend (`posts.metadata.cover`,
 * see api-v1-products/lib/listing-cover.ts `CoverProvenance`). Only the
 * fields needed for the disclosure and the source/license credit are read.
 */
export const COVER_DISCLOSURE = "Reference image; not a photograph of the listed item";

export type CoverCredit = {
  sourcePageUrl: string;
  license: string;
  licenseUrl: string | null;
  artist: string | null;
  disclosure: string;
};

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  // Artist credits from Commons may carry markup; keep plain text only.
  const plain = value.replace(/<[^>]*>/g, "").trim();
  return plain ? plain.slice(0, max) : null;
}

export function getCoverCredit(metadata: unknown): CoverCredit | null {
  if (!metadata || typeof metadata !== "object") return null;
  const cover = (metadata as Record<string, unknown>).cover;
  if (!cover || typeof cover !== "object") return null;
  const record = cover as Record<string, unknown>;
  if (record.kind !== "reference") return null;
  const sourcePageUrl = httpsUrl(record.sourcePageUrl);
  const license = text(record.license, 80);
  if (!sourcePageUrl || !license) return null;
  return {
    sourcePageUrl,
    license,
    licenseUrl: httpsUrl(record.licenseUrl),
    artist: text(record.artist),
    disclosure: COVER_DISCLOSURE,
  };
}
