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
  getChallengeTags,
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
  getPopularProductIds,
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

// Forum data functions
export {
  getForumPosts,
  getForumCategories,
  getForumTags as getForumTagsList,
  getForumPageData,
  type SortOption,
  type ForumStats,
  type LeaderboardUser,
  type ForumPageData,
} from './forum';

// Forum types from API layer
export type { ForumPost, ForumCategory, ForumTag } from '@/api/forumAPI';

// Admin data functions
export {
  getDashboardStats,
  getAuditLogs,
  getPendingListings,
  type DashboardStats,
  type AuditLog,
  type PendingListing,
} from './admin';

// Map data functions
export {
  getMapLocations,
  getAllMapLocations,
  getNearbyLocations,
  getLocationCountsByType,
} from './maps';

// Challenge data functions
export {
  getChallenges,
  getChallengeById,
  getChallengesByDifficulty,
  getUserChallenges,
  getPopularChallenges,
  type Challenge,
} from './challenges';
