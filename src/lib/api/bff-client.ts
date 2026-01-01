/**
 * Backend-For-Frontend Client
 *
 * Provides unified access to all BFF RPC functions for optimized data fetching.
 * Each function returns aggregated data to minimize client round-trips.
 *
 * SYNC: This mirrors iOS BFFService and Android BFFService
 */

import { createClient } from "@/lib/supabase/client";

// MARK: - Types

export interface HomeScreenData {
  nearbyListings: ListingSummary[];
  trendingListings: ListingSummary[];
  unreadCounts: { messages: number; notifications: number };
  userStats?: { listingsCount: number; savedCount: number; arrangementsCount: number };
  hasMore: boolean;
}

export interface ListingSummary {
  id: number;
  title: string;
  description?: string;
  image?: string;
  category?: string;
  categoryId?: number;
  postType?: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  distance?: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
  };
}

export interface FeedScreenData {
  listings: FeedListing[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface FeedListing extends ListingSummary {
  images?: string[];
  latitude?: number;
  longitude?: number;
  address?: string;
  viewsCount: number;
  savesCount: number;
  commentsCount: number;
  isSaved?: boolean;
  author: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    isVerified: boolean;
  };
}

export interface ListingDetailData {
  success: boolean;
  error?: string;
  listing?: ListingDetail;
  relatedListings?: RelatedListing[];
  authorListings?: RelatedListing[];
}

export interface ListingDetail {
  id: number;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  category?: string;
  categoryId?: number;
  postType?: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  viewsCount: number;
  savesCount: number;
  commentsCount: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    rating?: number;
    isVerified: boolean;
    listingsCount?: number;
    joinedAt?: string;
  };
  isSaved?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface RelatedListing {
  id: number;
  title: string;
  image?: string;
  distance?: number;
}

export interface MessagesScreenData {
  conversations: Conversation[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  listingId?: number;
  listingTitle?: string;
  listingImage?: string;
  updatedAt: string;
}

export interface ChatScreenData {
  success: boolean;
  room?: ChatRoom;
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface ChatRoom {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  };
  listing?: {
    id: number;
    title: string;
    image?: string;
    status?: string;
  };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  messageType?: string;
  metadata?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export interface ProfileScreenData {
  profile: ProfileInfo;
  listings?: ProfileListing[];
  reviews?: ProfileReview[];
  stats: ProfileStats;
  isOwnProfile: boolean;
  isFollowing?: boolean;
}

export interface ProfileInfo {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  location?: string;
  isVerified: boolean;
  joinedAt: string;
}

export interface ProfileListing {
  id: number;
  title: string;
  image?: string;
  status?: string;
  createdAt: string;
}

export interface ProfileReview {
  id: number;
  rating: number;
  comment?: string;
  reviewerName: string;
  reviewerAvatar?: string;
  createdAt: string;
}

export interface ProfileStats {
  listingsCount: number;
  completedCount: number;
  rating?: number;
  reviewsCount: number;
  impactScore?: number;
}

export interface NotificationsScreenData {
  notifications: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  timeAgo?: string;
}

export interface UnreadCountsData {
  messages: number;
  notifications: number;
  total: number;
}

export interface ChallengesScreenData {
  challenges: Challenge[];
  userChallenges: UserChallenge[];
  leaderboard: LeaderboardEntry[];
  stats: ChallengeStats;
  hasMore: boolean;
}

export interface Challenge {
  id: number;
  title: string;
  description?: string;
  image?: string;
  difficulty?: string;
  score: number;
  participantsCount: number;
  completionRate?: number;
  createdAt: string;
  hasJoined?: boolean;
  isCompleted?: boolean;
}

export interface UserChallenge {
  id: number;
  challengeId: number;
  title: string;
  image?: string;
  score: number;
  isCompleted: boolean;
  joinedAt: string;
  completedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  score: number;
  completedCount: number;
}

export interface ChallengeStats {
  totalChallenges: number;
  totalParticipants: number;
  userRank?: number;
  userScore?: number;
}

export interface ChallengeDetailData {
  success: boolean;
  error?: string;
  challenge?: ChallengeDetail;
  participants?: Participant[];
  relatedChallenges?: RelatedChallenge[];
}

export interface ChallengeDetail extends Challenge {
  action?: string;
  creator?: { id: string; name: string; avatar?: string };
  joinedAt?: string;
  completedAt?: string;
}

export interface Participant {
  userId: string;
  name: string;
  avatar?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface RelatedChallenge {
  id: number;
  title: string;
  image?: string;
  difficulty?: string;
  score: number;
}

export interface ForumPostDetailData {
  success: boolean;
  error?: string;
  post?: ForumPost;
  comments?: ForumComment[];
  relatedPosts?: RelatedPost[];
}

export interface ForumPost {
  id: number;
  title: string;
  content?: string;
  image?: string;
  categoryId?: number;
  categoryName?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  hasLiked?: boolean;
  hasBookmarked?: boolean;
}

export interface ForumComment {
  id: number;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  parentId?: number;
  depth: number;
  likesCount: number;
  createdAt: string;
  hasLiked?: boolean;
}

export interface RelatedPost {
  id: number;
  title: string;
  commentsCount: number;
}


// MARK: - Cache

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateCacheMatching(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearCache(): void {
  cache.clear();
}

// MARK: - BFF Client

/**
 * Fetch all data needed for the home screen in a single call.
 */
export async function getHomeScreenData(params: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  feedLimit?: number;
  trendingLimit?: number;
}): Promise<HomeScreenData> {
  const cacheKey = `home_${params.userId}_${Math.round(params.latitude * 100)}_${Math.round(params.longitude * 100)}`;
  const cached = getCached<HomeScreenData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_home_screen_data", {
    p_user_id: params.userId,
    p_lat: params.latitude,
    p_lng: params.longitude,
    p_radius_km: params.radiusKm ?? 10,
    p_feed_limit: params.feedLimit ?? 20,
    p_trending_limit: params.trendingLimit ?? 5,
  });

  if (error) throw error;
  setCache(cacheKey, data, 60_000);
  return data;
}

/**
 * Fetch paginated feed data with location-based filtering.
 */
export async function getFeedData(params: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  cursor?: string;
  postType?: string;
  categoryId?: number;
}): Promise<FeedScreenData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_bff_feed_data", {
    p_user_id: params.userId,
    p_lat: params.latitude,
    p_lng: params.longitude,
    p_radius_km: params.radiusKm ?? 10,
    p_limit: params.limit ?? 20,
    p_cursor: params.cursor ?? null,
    p_post_type: params.postType ?? null,
    p_category_id: params.categoryId ?? null,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch complete listing detail with related content.
 */
export async function getListingDetail(params: {
  listingId: number;
  viewerId?: string;
}): Promise<ListingDetailData> {
  const cacheKey = `listing_${params.listingId}`;
  const cached = getCached<ListingDetailData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_listing_detail_data", {
    p_listing_id: params.listingId,
    p_viewer_id: params.viewerId ?? null,
  });

  if (error) throw error;
  if (data.success) setCache(cacheKey, data, 30_000);
  return data;
}

/**
 * Fetch conversations list with last messages.
 */
export async function getMessagesData(params: {
  userId: string;
  limit?: number;
  cursor?: string;
  includeArchived?: boolean;
}): Promise<MessagesScreenData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_bff_messages_data", {
    p_user_id: params.userId,
    p_limit: params.limit ?? 20,
    p_cursor: params.cursor ?? null,
    p_include_archived: params.includeArchived ?? false,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch chat room data with messages.
 */
export async function getChatScreenData(params: {
  roomId: string;
  userId: string;
  messagesLimit?: number;
}): Promise<ChatScreenData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_chat_screen_data", {
    p_room_id: params.roomId,
    p_user_id: params.userId,
    p_messages_limit: params.messagesLimit ?? 50,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch profile data with listings and reviews.
 */
export async function getProfileData(params: {
  profileId: string;
  viewerId: string;
  includeListings?: boolean;
  includeReviews?: boolean;
  listingsLimit?: number;
  reviewsLimit?: number;
}): Promise<ProfileScreenData> {
  const cacheKey = `profile_${params.profileId}`;
  const cached = getCached<ProfileScreenData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_bff_profile_data", {
    p_profile_id: params.profileId,
    p_viewer_id: params.viewerId,
    p_include_listings: params.includeListings ?? true,
    p_include_reviews: params.includeReviews ?? true,
    p_listings_limit: params.listingsLimit ?? 6,
    p_reviews_limit: params.reviewsLimit ?? 5,
  });

  if (error) throw error;
  setCache(cacheKey, data, 120_000);
  return data;
}

/**
 * Fetch notifications with filtering.
 */
export async function getNotificationsData(params: {
  userId: string;
  filter?: string;
  limit?: number;
  offset?: number;
}): Promise<NotificationsScreenData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_notifications_screen", {
    p_user_id: params.userId,
    p_filter: params.filter ?? "all",
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch just unread counts for badge updates.
 */
export async function getUnreadCounts(userId: string): Promise<UnreadCountsData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_bff_unread_counts", {
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

/**
 * Fetch challenges with leaderboard and user progress.
 */
export async function getChallengesData(params: {
  userId?: string;
  difficulty?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<ChallengesScreenData> {
  const cacheKey = `challenges_${params.difficulty ?? "all"}_${params.sortBy ?? "popular"}_${params.offset ?? 0}`;
  const cached = getCached<ChallengesScreenData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_challenges_screen_data", {
    p_user_id: params.userId ?? null,
    p_difficulty: params.difficulty ?? null,
    p_sort_by: params.sortBy ?? "popular",
    p_page_limit: params.limit ?? 20,
    p_page_offset: params.offset ?? 0,
  });

  if (error) throw error;
  setCache(cacheKey, data, 120_000);
  return data;
}

/**
 * Fetch challenge detail with participants.
 */
export async function getChallengeDetail(params: {
  challengeId: number;
  userId?: string;
}): Promise<ChallengeDetailData> {
  const cacheKey = `challenge_${params.challengeId}`;
  const cached = getCached<ChallengeDetailData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_challenge_detail", {
    p_challenge_id: params.challengeId,
    p_user_id: params.userId ?? null,
  });

  if (error) throw error;
  if (data.success) setCache(cacheKey, data, 60_000);
  return data;
}

/**
 * Fetch forum post with comments.
 */
export async function getForumPostDetail(params: {
  postId: number;
  userId?: string;
  commentsLimit?: number;
}): Promise<ForumPostDetailData> {
  const cacheKey = `forum_post_${params.postId}`;
  const cached = getCached<ForumPostDetailData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_forum_post_detail", {
    p_post_id: params.postId,
    p_user_id: params.userId ?? null,
    p_comments_limit: params.commentsLimit ?? 50,
  });

  if (error) throw error;
  if (data.success) setCache(cacheKey, data, 30_000);
  return data;
}

// MARK: - React Query Hooks (optional usage)

export const bffQueryKeys = {
  home: (userId: string, lat: number, lng: number) => ["bff", "home", userId, lat, lng] as const,
  feed: (userId: string, lat: number, lng: number) => ["bff", "feed", userId, lat, lng] as const,
  listing: (id: number) => ["bff", "listing", id] as const,
  messages: (userId: string) => ["bff", "messages", userId] as const,
  chat: (roomId: string) => ["bff", "chat", roomId] as const,
  profile: (profileId: string) => ["bff", "profile", profileId] as const,
  notifications: (userId: string) => ["bff", "notifications", userId] as const,
  unreadCounts: (userId: string) => ["bff", "unreadCounts", userId] as const,
  challenges: (difficulty?: string, sortBy?: string) => ["bff", "challenges", difficulty, sortBy] as const,
  challenge: (id: number) => ["bff", "challenge", id] as const,
  forumPost: (id: number) => ["bff", "forumPost", id] as const,
};


// MARK: - Forum Feed Types

export interface ForumFeedScreenData {
  success: boolean;
  posts: ForumPostSummary[];
  categories: ForumCategoryItem[];
  featured: FeaturedForumPost[];
  userStats?: ForumUserStats;
  pagination: { limit: number; offset: number; hasMore: boolean };
}

export interface ForumPostSummary {
  id: number;
  title: string;
  description?: string;
  image?: string;
  commentsCount: number;
  likesCount?: number;
  viewsCount: number;
  postType?: string;
  isPinned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  slug?: string;
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
  createdAt: string;
  lastActivityAt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    isVerified: boolean;
  };
  userInteraction: {
    hasReacted: boolean;
    hasBookmarked: boolean;
  };
}

export interface ForumCategoryItem {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  slug?: string;
  postCount: number;
}

export interface FeaturedForumPost {
  id: number;
  title: string;
  image?: string;
  slug?: string;
  authorName: string;
  featuredAt?: string;
}

export interface ForumUserStats {
  postsCount: number;
  commentsCount: number;
  bookmarksCount: number;
  unreadNotifications: number;
}

// MARK: - Search Types

export interface SearchScreenData {
  success: boolean;
  hasQuery: boolean;
  query?: string;
  listings?: SearchListing[];
  users?: SearchUser[];
  forumPosts?: SearchForumPost[];
  suggestions?: string[];
  trending?: TrendingSearch[];
  recentSearches?: RecentSearch[];
  pagination?: SearchPagination;
}

export interface SearchListing {
  id: number;
  title: string;
  description?: string;
  image?: string;
  postType?: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
  viewsCount: number;
  distance?: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface SearchUser {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  listingsCount: number;
  rating?: number;
}

export interface SearchForumPost {
  id: number;
  title: string;
  description?: string;
  image?: string;
  commentsCount: number;
  likesCount?: number;
  slug?: string;
  categoryName?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface TrendingSearch {
  query: string;
  count: number;
}

export interface RecentSearch {
  query: string;
  searchedAt: string;
}

export interface SearchPagination {
  limit: number;
  offset: number;
  totalCount?: number;
  hasMore: boolean;
}

// MARK: - Forum Feed Function

/**
 * Fetch forum feed with posts, categories, and featured content.
 */
export async function getForumFeedData(params: {
  userId?: string;
  categoryId?: number;
  postType?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
}): Promise<ForumFeedScreenData> {
  const cacheKey = `forum_feed_${params.categoryId ?? 0}_${params.sortBy ?? "recent"}_${params.offset ?? 0}`;
  const cached = getCached<ForumFeedScreenData>(cacheKey);
  if (cached) return cached;

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_forum_feed_data", {
    p_user_id: params.userId ?? null,
    p_category_id: params.categoryId ?? null,
    p_post_type: params.postType ?? null,
    p_sort_by: params.sortBy ?? "recent",
    p_page_limit: params.limit ?? 20,
    p_page_offset: params.offset ?? 0,
  });

  if (error) throw error;
  setCache(cacheKey, data, 60_000);
  return data;
}

// MARK: - Search Function

/**
 * Fetch search results or suggestions.
 */
export async function getSearchData(params: {
  userId?: string;
  query?: string;
  searchType?: "all" | "listings" | "users" | "forum";
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  categoryId?: number;
  limit?: number;
  offset?: number;
}): Promise<SearchScreenData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_search_screen_data", {
    p_user_id: params.userId ?? null,
    p_query: params.query ?? null,
    p_search_type: params.searchType ?? "all",
    p_latitude: params.latitude ?? null,
    p_longitude: params.longitude ?? null,
    p_radius_km: params.radiusKm ?? 50,
    p_category_id: params.categoryId ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;
  return data;
}

// Update query keys
export const bffQueryKeysExtended = {
  ...bffQueryKeys,
  forumFeed: (categoryId?: number, sortBy?: string) => ["bff", "forumFeed", categoryId, sortBy] as const,
  search: (query?: string, type?: string) => ["bff", "search", query, type] as const,
};
