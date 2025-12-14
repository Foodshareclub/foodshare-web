/**
 * Post Activity Logging Type Definitions
 *
 * Types for the comprehensive post activity logging system.
 * Supports analytics, debugging, audit trails, and user activity tracking.
 *
 * @module types/post-activity.types
 */

// ============================================================================
// Activity Type Enum
// ============================================================================

/**
 * All possible post activity types
 */
export type PostActivityType =
  // Lifecycle events
  | "created"
  | "updated"
  | "deleted"
  | "restored"

  // Status changes
  | "activated"
  | "deactivated"
  | "expired"

  // Arrangement flow
  | "viewed"
  | "contacted"
  | "arranged"
  | "arrangement_cancelled"
  | "collected"
  | "not_collected"

  // Moderation
  | "reported"
  | "flagged"
  | "unflagged"
  | "approved"
  | "rejected"
  | "hidden"
  | "unhidden"

  // Engagement
  | "liked"
  | "unliked"
  | "shared"
  | "bookmarked"
  | "unbookmarked"

  // Admin actions
  | "admin_edited"
  | "admin_note_added"
  | "admin_status_changed"

  // System events
  | "auto_expired"
  | "auto_deactivated"
  | "location_updated"
  | "images_updated";

// ============================================================================
// Activity Categories (for filtering)
// ============================================================================

export const ACTIVITY_CATEGORIES = {
  lifecycle: ["created", "updated", "deleted", "restored"] as PostActivityType[],
  status: ["activated", "deactivated", "expired"] as PostActivityType[],
  arrangement: [
    "viewed",
    "contacted",
    "arranged",
    "arrangement_cancelled",
    "collected",
    "not_collected",
  ] as PostActivityType[],
  moderation: [
    "reported",
    "flagged",
    "unflagged",
    "approved",
    "rejected",
    "hidden",
    "unhidden",
  ] as PostActivityType[],
  engagement: ["liked", "unliked", "shared", "bookmarked", "unbookmarked"] as PostActivityType[],
  admin: ["admin_edited", "admin_note_added", "admin_status_changed"] as PostActivityType[],
  system: [
    "auto_expired",
    "auto_deactivated",
    "location_updated",
    "images_updated",
  ] as PostActivityType[],
} as const;

// ============================================================================
// Activity Log Entry
// ============================================================================

/**
 * Full post activity log entry from database
 */
export interface PostActivityLog {
  id: string;
  post_id: number;
  actor_id: string | null;
  activity_type: PostActivityType;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  reason: string | null;
  notes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  related_post_id: number | null;
  related_profile_id: string | null;
  related_room_id: string | null;
  created_at: string;
}

/**
 * Activity log with actor profile info (for display)
 */
export interface PostActivityLogWithActor extends PostActivityLog {
  actor?: {
    id: string;
    nickname: string;
    avatar_url: string;
  } | null;
}

// ============================================================================
// Timeline Item (for UI display)
// ============================================================================

/**
 * Simplified activity item for timeline display
 */
export interface PostActivityTimelineItem {
  id: string;
  activity_type: PostActivityType;
  actor_id: string | null;
  actor_nickname: string | null;
  actor_avatar: string | null;
  changes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// Activity Summary
// ============================================================================

/**
 * Summary of user's post activities
 */
export interface UserActivitySummary {
  activity_type: PostActivityType;
  count: number;
  last_activity: string;
}

/**
 * Post activity counts by type
 */
export type PostActivityCounts = Partial<Record<PostActivityType, number>>;

// ============================================================================
// Daily Stats
// ============================================================================

/**
 * Daily aggregated statistics for post activities
 */
export interface PostActivityDailyStats {
  id: string;
  date: string;
  post_type: string;

  // Activity counts
  posts_created: number;
  posts_updated: number;
  posts_deleted: number;
  posts_viewed: number;
  posts_arranged: number;
  posts_collected: number;
  posts_reported: number;
  posts_expired: number;

  // Engagement counts
  total_likes: number;
  total_shares: number;
  total_contacts: number;

  // Unique counts
  unique_posters: number;
  unique_viewers: number;
  unique_arrangers: number;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// Input Types (for actions)
// ============================================================================

/**
 * Input for logging a post activity
 */
export interface LogPostActivityInput {
  postId: number;
  activityType: PostActivityType;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  reason?: string;
  notes?: string;
  relatedPostId?: number;
  relatedProfileId?: string;
  relatedRoomId?: string;
}

/**
 * Input for getting activity timeline
 */
export interface GetActivityTimelineInput {
  postId: number;
  limit?: number;
  offset?: number;
  activityTypes?: PostActivityType[];
}

// ============================================================================
// Activity Display Helpers
// ============================================================================

/**
 * Human-readable labels for activity types
 */
export const ACTIVITY_TYPE_LABELS: Record<PostActivityType, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  restored: "Restored",
  activated: "Activated",
  deactivated: "Deactivated",
  expired: "Expired",
  viewed: "Viewed",
  contacted: "Contacted",
  arranged: "Arranged",
  arrangement_cancelled: "Arrangement Cancelled",
  collected: "Collected",
  not_collected: "Not Collected",
  reported: "Reported",
  flagged: "Flagged",
  unflagged: "Unflagged",
  approved: "Approved",
  rejected: "Rejected",
  hidden: "Hidden",
  unhidden: "Unhidden",
  liked: "Liked",
  unliked: "Unliked",
  shared: "Shared",
  bookmarked: "Bookmarked",
  unbookmarked: "Unbookmarked",
  admin_edited: "Admin Edited",
  admin_note_added: "Admin Note Added",
  admin_status_changed: "Admin Status Changed",
  auto_expired: "Auto Expired",
  auto_deactivated: "Auto Deactivated",
  location_updated: "Location Updated",
  images_updated: "Images Updated",
};

/**
 * Icons for activity types (react-icons names)
 */
export const ACTIVITY_TYPE_ICONS: Record<PostActivityType, string> = {
  created: "FiPlus",
  updated: "FiEdit",
  deleted: "FiTrash2",
  restored: "FiRotateCcw",
  activated: "FiToggleRight",
  deactivated: "FiToggleLeft",
  expired: "FiClock",
  viewed: "FiEye",
  contacted: "FiMessageCircle",
  arranged: "FiCheckCircle",
  arrangement_cancelled: "FiXCircle",
  collected: "FiPackage",
  not_collected: "FiAlertCircle",
  reported: "FiFlag",
  flagged: "FiAlertTriangle",
  unflagged: "FiCheck",
  approved: "FiThumbsUp",
  rejected: "FiThumbsDown",
  hidden: "FiEyeOff",
  unhidden: "FiEye",
  liked: "FiHeart",
  unliked: "FiHeart",
  shared: "FiShare2",
  bookmarked: "FiBookmark",
  unbookmarked: "FiBookmark",
  admin_edited: "FiEdit3",
  admin_note_added: "FiFileText",
  admin_status_changed: "FiSettings",
  auto_expired: "FiClock",
  auto_deactivated: "FiPower",
  location_updated: "FiMapPin",
  images_updated: "FiImage",
};

/**
 * Colors for activity types (Tailwind classes)
 */
export const ACTIVITY_TYPE_COLORS: Record<PostActivityType, string> = {
  created: "text-green-500",
  updated: "text-blue-500",
  deleted: "text-red-500",
  restored: "text-green-500",
  activated: "text-green-500",
  deactivated: "text-gray-500",
  expired: "text-orange-500",
  viewed: "text-gray-400",
  contacted: "text-blue-500",
  arranged: "text-green-500",
  arrangement_cancelled: "text-red-500",
  collected: "text-green-600",
  not_collected: "text-red-500",
  reported: "text-red-500",
  flagged: "text-orange-500",
  unflagged: "text-green-500",
  approved: "text-green-500",
  rejected: "text-red-500",
  hidden: "text-gray-500",
  unhidden: "text-green-500",
  liked: "text-pink-500",
  unliked: "text-gray-400",
  shared: "text-blue-500",
  bookmarked: "text-yellow-500",
  unbookmarked: "text-gray-400",
  admin_edited: "text-purple-500",
  admin_note_added: "text-purple-500",
  admin_status_changed: "text-purple-500",
  auto_expired: "text-orange-500",
  auto_deactivated: "text-gray-500",
  location_updated: "text-blue-500",
  images_updated: "text-blue-500",
};
