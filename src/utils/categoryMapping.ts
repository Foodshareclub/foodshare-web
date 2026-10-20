/**
 * Category Mapping Utilities
 *
 * Maps between plural URL slugs and singular database post_type values
 *
 * URL Structure: /things, /foodbanks, /fridges (plural, user-facing)
 * Database: post_type = 'thing', 'foodbank', 'fridge' (singular, internal)
 */

import { slugify } from "@/lib/strings";

/**
 * Map URL slugs (both singular and plural) to singular database post_type values
 */
export const URL_TO_DB_MAP: Record<string, string> = {
  // Food
  food: "food",
  // Things (singular and plural)
  thing: "thing",
  things: "thing",
  // Borrow
  borrow: "borrow",
  // Wanted
  wanted: "wanted",
  // Foodbank (singular, plural, and camelCase from categoryConfig)
  foodbank: "foodbank",
  foodbanks: "foodbank",
  foodBank: "foodbank",
  // Fridge (singular and plural)
  fridge: "fridge",
  fridges: "fridge",
  // Organisation (singular and plural) - maps to business in DB
  organisation: "business",
  organisations: "business",
  // Volunteer (singular and plural)
  volunteer: "volunteer",
  volunteers: "volunteer",
  // Challenge (singular and plural)
  challenge: "challenge",
  challenges: "challenge",
  // Zero Waste
  zerowaste: "zerowaste",
  // Vegan (including hyphenated form from categoryConfig)
  vegan: "vegan",
  "vegan-food": "vegan",
  // Forum
  forum: "forum",
};

/**
 * Map singular database post_type values to plural URL slugs
 */
export const DB_TO_URL_MAP: Record<string, string> = {
  food: "food",
  thing: "things",
  borrow: "borrow",
  wanted: "wanted",
  foodbank: "foodbanks",
  fridge: "fridges",
  business: "organisations",
  volunteer: "volunteers",
  challenge: "challenges",
  zerowaste: "zerowaste",
  vegan: "vegan",
  forum: "forum",
};

/**
 * Convert a plural URL slug to singular database post_type
 * @param urlSlug - The plural URL slug (e.g., "things", "foodbanks")
 * @returns The singular database value (e.g., "thing", "foodbank")
 */
export const urlToDbType = (urlSlug: string): string => {
  const normalized = urlSlug.toLowerCase();
  return URL_TO_DB_MAP[normalized] || normalized;
};

/**
 * Convert a singular database post_type to plural URL slug
 * @param dbType - The singular database value (e.g., "thing", "foodbank")
 * @returns The plural URL slug (e.g., "things", "foodbanks")
 */
export const dbToUrlType = (dbType: string): string => {
  const normalized = dbType.toLowerCase();
  return DB_TO_URL_MAP[normalized] || normalized;
};

/**
 * Detail URLs for entities that have a real detail page outside `/product`.
 *
 * Everything else resolves to the canonical `/product/[id]` route. `next.config.ts`
 * 308-redirects all the category-prefixed detail paths (`/thing/:id+`,
 * `/fridge/:id+`, …) to `/product/:id*` for external/legacy inbound SEO
 * traffic, and Next evaluates redirects *before* the filesystem — so a link to
 * `/thing/123` is answered with a 308, which the client router turns into a
 * hard navigation. The `(.)thing` intercept could therefore never fire, and
 * every product click was a full page load with no modal.
 *
 * Generating `/product/[id]` directly means internal links soft-navigate, the
 * `@modal/(.)product` intercept fires, and the modal opens. The redirects stay
 * for external links, where a hard navigation is exactly what you want.
 */
const NON_PRODUCT_DETAIL_SLUG: Record<string, string> = {
  challenge: "challenge",
  forum: "forum",
};

/**
 * Generate the canonical detail page URL.
 *
 * @param postType - The database post_type value (e.g., "thing", "fridge", "business")
 * @param id - The entity ID
 * @returns The detail page URL (e.g., "/product/123", "/challenge/42")
 *
 * Challenges keep their own prefix because they live in the `challenges` table,
 * not `posts`, and `/challenge/[id]` is a real page rather than a redirect.
 */
export const getProductDetailUrl = (postType: string | undefined | null, id: number | string): string => {
  // Normalise through URL_TO_DB_MAP so plural ("challenges") and camelCase
  // ("foodBank") variants resolve the same way, and the post_type actually
  // stored on the row is always the singular column value.
  const normalized = postType ? urlToDbType(postType) : "food";
  const ownSlug = NON_PRODUCT_DETAIL_SLUG[normalized];
  return ownSlug ? `/${ownSlug}/${id}` : `/product/${id}`;
};

/**
 * The canonical `/product/[id]` path segment for a listing, e.g. `123-tomatoes`.
 *
 * `/product/[id]/page.tsx` treats this as canonical and self-redirects any
 * mismatched slug, so this must be the single definition of it — the sitemap,
 * the ItemList JSON-LD and the page's own canonical check all have to agree or
 * structured data disagrees with the page.
 */
export const getProductCanonicalSlug = (product: {
  id: number;
  post_slug?: string | null;
  post_name?: string | null;
}): string => {
  const base = product.post_slug || slugify(product.post_name || "item");
  return `${product.id}-${slugify(base)}`;
};

/** Absolute canonical URL for a listing. Use for sitemap and JSON-LD. */
export const getProductCanonicalUrl = (
  product: { id: number; post_slug?: string | null; post_name?: string | null },
  siteUrl: string,
): string => `${siteUrl.replace(/\/$/, "")}/product/${getProductCanonicalSlug(product)}`;
