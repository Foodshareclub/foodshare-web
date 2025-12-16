/**
 * Category Mapping Utilities
 *
 * Maps between plural URL slugs and singular database post_type values
 *
 * URL Structure: /things, /foodbanks, /fridges (plural, user-facing)
 * Database: post_type = 'thing', 'foodbank', 'fridge' (singular, internal)
 */

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
 * Map database post_type to singular URL slug for detail pages
 * Detail pages use singular: /thing/123, /fridge/123, /organisation/123
 */
const DB_TO_DETAIL_SLUG: Record<string, string> = {
  food: "food",
  thing: "thing",
  borrow: "borrow",
  wanted: "wanted",
  foodbank: "foodbank",
  fridge: "fridge",
  business: "organisation",
  volunteer: "volunteer",
  challenge: "challenge",
  zerowaste: "zerowaste",
  vegan: "vegan",
  forum: "forum",
};

/**
 * Generate the detail page URL for a product
 * @param postType - The database post_type value (e.g., "thing", "fridge", "business")
 * @param id - The product ID
 * @returns The detail page URL (e.g., "/thing/123", "/fridge/456", "/organisation/789")
 */
export const getProductDetailUrl = (
  postType: string | undefined | null,
  id: number | string
): string => {
  const slug = postType
    ? DB_TO_DETAIL_SLUG[postType.toLowerCase()] || postType.toLowerCase()
    : "food";
  return `/${slug}/${id}`;
};
