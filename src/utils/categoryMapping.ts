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
  // Foodbank (singular and plural)
  foodbank: "foodbank",
  foodbanks: "foodbank",
  // Fridge (singular and plural)
  fridge: "fridge",
  fridges: "fridge",
  // Business
  business: "business",
  // Volunteer
  volunteer: "volunteer",
  // Challenge (singular and plural)
  challenge: "challenge",
  challenges: "challenge",
  // Zero Waste
  zerowaste: "zerowaste",
  // Vegan
  vegan: "vegan",
  // Community
  community: "community",
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
  business: "business",
  volunteer: "volunteer",
  challenge: "challenges",
  zerowaste: "zerowaste",
  vegan: "vegan",
  community: "community",
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
