/**
 * Unified API Layer for Edge Functions
 *
 * This module provides a consistent interface for calling Edge Functions
 * from the web app, enabling the "thick backend / thin client" architecture
 * where all platforms (Web, iOS, Android) share the same API.
 *
 * ## Usage
 *
 * ```ts
 * import { apiPost, apiGet, apiDelete } from "@/lib/api";
 * import { createProductAPI, deleteProductAPI } from "@/lib/api/products";
 * import { updateProfileAPI, uploadAvatarAPI } from "@/lib/api/profile";
 * ```
 *
 * ## Feature Flags
 *
 * Set these in .env.local to enable Edge Function routing:
 * - `USE_EDGE_FUNCTIONS_FOR_PRODUCTS=true` - Product mutations
 * - `USE_EDGE_FUNCTIONS_FOR_CHAT=true` - Chat operations
 * - `USE_EDGE_FUNCTIONS_FOR_PROFILE=true` - Profile operations
 *
 * ## Migration Status
 *
 * | Domain     | Status    | Notes |
 * |------------|-----------|-------|
 * | Products   | ✅ Ready  | createProduct, deleteProduct via Edge Functions |
 * | Chat       | ✅ Ready  | Uses api-v1-food-chat (food-sharing schema) |
 * | Profile    | ✅ Ready  | updateProfile, uploadAvatar, updateAddress |
 * | Reviews    | ✅ Ready  | submitReview via Edge Functions |
 * | Engagement | ✅ Ready  | toggleLike, toggleBookmark via Edge Functions |
 * | Admin      | ✅ Ready  | Listings, users, email management |
 *
 * @module api
 */

// Core client (legacy)
export { apiCall, apiGet, apiPost, apiPut, apiDelete } from "./client";
export type { APICallOptions } from "./client";

// Enterprise client (recommended)
export {
  EnterpriseClient,
  enterpriseClient,
  apiGet as enterpriseGet,
  apiPost as enterprisePost,
  apiPut as enterprisePut,
  apiPatch as enterprisePatch,
  apiDelete as enterpriseDelete,
  ErrorCodes,
} from "./enterprise-client";
export type {
  EnterpriseClientConfig,
  RequestOptions,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorCode,
} from "./enterprise-client";

// Circuit breaker
export {
  CircuitBreaker,
  CircuitOpenError,
  getCircuitBreaker,
  getAllCircuitBreakerMetrics,
  resetAllCircuitBreakers,
} from "./circuit-breaker";
export type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerMetrics,
} from "./circuit-breaker";

// Retry utilities
export {
  withRetry,
  createRetryWrapper,
  calculateBackoffDelay,
  isRetryableError,
  RetryPresets,
} from "./retry";
export type { RetryConfig } from "./retry";

// Offline queue
export {
  OfflineQueue,
  getOfflineQueue,
  enqueueOffline,
  useOfflineQueue,
} from "./offline-queue";
export type {
  QueuedOperation,
  OperationType,
  OfflineQueueConfig,
} from "./offline-queue";

// Types
export type {
  APIResponse,
  APISuccessResponse,
  APIErrorResponse,
  APIPaginatedResponse,
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductDetailResponse,
} from "./types";

// Product API
export {
  createProductAPI,
  updateProductAPI,
  deleteProductAPI,
  fromProductResponse,
} from "./products";
export type { WebCreateProductInput, WebUpdateProductInput } from "./products";

// Chat API
export {
  listRoomsAPI,
  getRoomAPI,
  createRoomAPI,
  sendMessageAPI,
  acceptRequestAPI,
  completeExchangeAPI,
  archiveRoomAPI,
} from "./chat";
export type {
  CreateRoomRequest,
  SendMessageRequest,
  RoomResponse,
  RoomDetailResponse,
  MessageResponse,
  RoomWithMessagesResponse,
} from "./chat";

// Profile API
export {
  getProfileAPI,
  updateProfileAPI,
  uploadAvatarAPI,
  deleteAvatarAPI,
  getAddressAPI,
  updateAddressAPI,
  formDataToProfileInput,
  formDataToAddressInput,
  fileToAvatarInput,
} from "./profile";
export type {
  UpdateProfileRequest,
  UpdateAddressRequest,
  UploadAvatarRequest,
  ProfileResponse,
  AddressResponse,
  AvatarUploadResponse,
} from "./profile";

// Reviews API
export {
  getReviewsForUserAPI,
  getReviewsForPostAPI,
  submitReviewAPI,
  formDataToReviewInput,
} from "./reviews";
export type {
  SubmitReviewRequest,
  ReviewResponse,
  ReviewsListResponse,
} from "./reviews";

// Engagement API
export {
  getEngagementAPI,
  getBatchEngagementAPI,
  toggleLikeAPI,
  toggleBookmarkAPI,
  recordShareAPI,
  getUserBookmarksAPI,
} from "./engagement";
export type {
  EngagementStatus,
  BatchEngagementStatus,
  ToggleLikeResponse,
  ToggleBookmarkResponse,
  UserBookmarksResponse,
} from "./engagement";

// Admin Listings API
export {
  updateListingAPI,
  activateListingAPI,
  deactivateListingAPI,
  deleteListingAPI,
  updateAdminNotesAPI,
  bulkActivateListingsAPI,
  bulkDeactivateListingsAPI,
  bulkDeleteListingsAPI,
  toUpdateListingRequest,
} from "./admin-listings";
export type {
  UpdateListingRequest,
  BulkIdsRequest,
  BulkDeactivateRequest,
  ListingActionResponse,
  BulkActionResponse,
} from "./admin-listings";

// Admin Users API
export {
  listUsersAPI,
  updateUserRoleAPI,
  updateUserRolesAPI,
  banUserAPI,
  unbanUserAPI,
  fromAdminUserResponse,
} from "./admin-users";
export type {
  AdminUser,
  ListUsersRequest,
  ListUsersResponse,
  UserActionResponse,
} from "./admin-users";

// Admin Email API
export {
  retryEmailAPI,
  deleteQueuedEmailAPI,
  sendManualEmailAPI,
  resetProviderQuotaAPI,
  updateProviderAvailabilityAPI,
  resetCircuitBreakerAPI,
  addToSuppressionListAPI,
  removeFromSuppressionListAPI,
} from "./admin-email";
export type {
  EmailProvider,
  EmailType,
  SuppressionReason,
  SendManualEmailRequest,
  QueueActionResponse,
  ProviderActionResponse,
  SuppressionActionResponse,
} from "./admin-email";

// BFF Client (Backend-For-Frontend)
export {
  getHomeScreenData,
  getFeedData,
  getListingDetail,
  getMessagesData,
  getChatScreenData,
  getProfileData,
  getNotificationsData,
  getUnreadCounts,
  getChallengesData,
  getChallengeDetail,
  getForumPostDetail,
  getForumFeedData,
  getSearchData,
  invalidateCache,
  invalidateCacheMatching,
  clearCache,
  bffQueryKeys,
  bffQueryKeysExtended,
} from "./bff-client";
export type {
  HomeScreenData,
  ListingSummary,
  FeedScreenData,
  FeedListing,
  ListingDetailData,
  ListingDetail,
  RelatedListing,
  MessagesScreenData,
  Conversation,
  ChatScreenData,
  ChatRoom,
  ChatMessage,
  ProfileScreenData,
  ProfileInfo,
  ProfileListing,
  ProfileReview,
  ProfileStats,
  NotificationsScreenData,
  NotificationItem,
  UnreadCountsData,
  ChallengesScreenData,
  Challenge,
  UserChallenge,
  LeaderboardEntry,
  ChallengeStats,
  ChallengeDetailData,
  ChallengeDetail,
  Participant,
  RelatedChallenge,
  ForumPostDetailData,
  ForumPost,
  ForumComment,
  RelatedPost,
  ForumFeedScreenData,
  ForumPostSummary,
  ForumCategoryItem,
  FeaturedForumPost,
  ForumUserStats,
  SearchScreenData,
  SearchListing,
  SearchUser,
  SearchForumPost,
  TrendingSearch,
  RecentSearch,
  SearchPagination,
} from "./bff-client";
