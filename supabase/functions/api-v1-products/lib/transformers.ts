/**
 * Product API v1 Transformers — 10x SEO
 * Adds agnostic canonical fields without breaking snake_case contract
 */

import { transformCategory, transformProfileSummary } from "../../_shared/transformers.ts";
import { slugify } from "../../_shared/utils.ts";

export function transformProduct(data: Record<string, unknown>) {
  // Return raw database format (snake_case) for web compatibility
  const raw = { ...data } as Record<string, unknown>;
  const id = raw.id as number | string | undefined;
  const postSlug = (raw.post_slug as string) || (raw.slug as string) || "";
  const postName = (raw.post_name as string) || (raw.title as string) || "";
  const computedSlug = postSlug || slugify(postName);
  const canonicalSlug = id ? `${id}-${computedSlug}` : computedSlug;
  const baseUrl = Deno.env.get("SITE_URL") || Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
    "https://foodshare.club";
  // Add agnostic SEO fields (non-breaking)
  if (id && !raw.slug) raw.slug = computedSlug;
  if (id && !raw.post_slug) raw.post_slug = computedSlug;
  if (id) {
    raw.canonical_slug = canonicalSlug;
    raw.canonicalSlug = canonicalSlug;
    raw.canonical_url = `${baseUrl}/product/${canonicalSlug}`;
    raw.canonicalUrl = `${baseUrl}/product/${canonicalSlug}`;
  }
  return raw;
}

export function transformProductDetail(data: Record<string, unknown>) {
  const base = transformProduct(data);
  const profile = data.profile as Record<string, unknown> | null;
  const category = data.category as Record<string, unknown> | null;

  const profileSummary = transformProfileSummary(profile);
  return {
    ...base,
    user: profileSummary ? { ...profileSummary, memberSince: profile?.created_at ?? null } : null,
    category: transformCategory(category),
  };
}
