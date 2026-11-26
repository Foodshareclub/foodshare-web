/**
 * Post types that are public places rather than someone's home.
 *
 * Fridges and food banks are published with their exact address and pin (user
 * decision 2026-11-26). Every other type keeps the 100-200 m approximation in
 * `approximateLocation`.
 *
 * This mirrors `public.is_public_place_post_type()` from the backend migration
 * `20261126030000_exact_location_for_fridges_and_foodbanks.sql`: the database
 * already returns the exact point and the full address for these types, so the
 * client must not move them again and must not draw an uncertainty circle.
 */
const PUBLIC_PLACE_POST_TYPES = new Set(["fridge", "foodbank"]);

export function hasExactPublicLocation(postType: string | null | undefined): boolean {
  return postType ? PUBLIC_PLACE_POST_TYPES.has(postType.toLowerCase()) : false;
}
