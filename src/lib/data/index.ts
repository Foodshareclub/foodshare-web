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
  getNotificationTags,
  getAdminTags,
  invalidateAdminCaches,
} from "./cache-keys";

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
} from "./products";

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
} from "./profiles";

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
} from "./forum";

// Forum types from API layer
export type { ForumPost, ForumCategory, ForumTag } from "@/api/forumAPI";

// Admin data functions
export {
  getDashboardStats,
  getAuditLogs,
  getPendingListings,
  type DashboardStats,
  type AuditLog,
  type PendingListing,
} from "./admin";

// Admin reports
export { getReportsData, getCachedReportsData, type ReportsData } from "./admin-reports";

// Admin listings
export {
  getAdminListings,
  getCachedAdminListings,
  getAdminListingById,
  getListingStats,
  type AdminListing,
  type AdminListingsFilter,
  type AdminListingsResult,
  type ListingStats,
} from "./admin-listings";

// Admin users
export {
  getAdminUsers,
  getCachedAdminUsers,
  getAdminUserById,
  getUserStats as getAdminUserStats,
  type AdminUserProfile,
  type AdminUsersFilter,
  type AdminUsersResult,
  type UserStats as AdminUserStats,
} from "./admin-users";

// Map data functions
export {
  getMapLocations,
  getAllMapLocations,
  getNearbyLocations,
  getLocationCountsByType,
} from "./maps";

// Challenge data functions
export {
  getChallenges,
  getChallengeById,
  getChallengesByDifficulty,
  getUserChallenges,
  getPopularChallenges,
  type Challenge,
} from "./challenges";

// Auth data functions
export {
  getCurrentUser,
  checkIsAdmin,
  getAuthSession,
  getCachedAuthSession,
  getAdminAuth,
  requireAdmin,
  requireSuperAdmin,
  type AuthUser,
  type AuthSession,
} from "./auth";

// Admin auth utilities (centralized)
export { logAdminAction, type AdminAuthResult } from "./admin-auth";

// Chat data functions
export {
  getUserChatRooms,
  getChatRoom,
  getOrCreateChatRoom,
  getChatMessages,
  getUnreadMessageCount,
  getAllUserChats,
  getTotalUnreadCount,
  type ChatRoom,
  type ChatMessage,
  type UnifiedChatRoom,
} from "./chat";

// Admin email CRM
export {
  getEmailDashboardStats,
  getProviderHealth,
  getRecentCampaigns,
  getActiveAutomations,
  getAudienceSegments,
  getEmailCRMData,
  getEmailMonitoringData,
  type EmailDashboardStats,
  type ProviderHealth,
  type RecentCampaign,
  type ActiveAutomation,
  type AudienceSegment,
  type EmailCRMData,
  type ProviderStatus,
  type QuotaStatus,
  type RecentEmail,
  type HealthEvent,
  type EmailMonitoringData,
} from "./admin-email";

// Admin AI insights
export {
  getPlatformMetrics,
  getChurnData,
  getEmailCampaignData,
  getGrokInsights,
  getSuggestedQuestions,
  clearInsightCache,
  type PlatformMetrics,
  type ChurnData,
  type EmailCampaignData,
} from "./admin-insights";
