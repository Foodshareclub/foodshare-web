/**
 * Data Layer Index
 *
 * Re-exports all cached data functions and cache utilities.
 */

// Cache configuration and utilities
export {
  CACHE_TAGS,
  CACHE_DURATIONS,
  CACHE_PROFILES,
  invalidateTag,
  getProductTags,
  getProfileTags,
  getForumTags,
} from './cache-keys';

// Product data functions
export {
  getProducts,
  getAllProducts,
  getProductById,
  getProductLocations,
  getAllProductLocations,
  getUserProducts,
  searchProducts,
  type InitialProductStateType,
  type LocationType,
} from './products';

// Profile data functions
export {
  getProfile,
  getPublicProfile,
  getUserStats,
  getVolunteers,
  getProfileReviews,
  type Profile,
  type PublicProfile,
  type ProfileStats,
  type ProfileReview,
} from './profiles';
