/**
 * Shared Enums and Type Constants
 * Centralized location for all enum-like types used across the application
 */

// ============================================================================
// Authentication
// ============================================================================

/**
 * Authentication view states for login/signup forms
 */
export const AuthView = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  FORGOT_PASSWORD: 'forgot_password',
  RESET_PASSWORD: 'reset_password',
  VERIFY_EMAIL: 'verify_email',
} as const;

export type AuthViewType = typeof AuthView[keyof typeof AuthView];

/**
 * Admin check status for role verification
 */
export const AdminCheckStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const;

export type AdminCheckStatusType = typeof AdminCheckStatus[keyof typeof AdminCheckStatus];

// ============================================================================
// Theme
// ============================================================================

/**
 * Theme modes supported by the application
 */
export const ThemeMode = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeModeType = typeof ThemeMode[keyof typeof ThemeMode];

// ============================================================================
// Products
// ============================================================================

/**
 * Product/post types
 */
export const ProductType = {
  FOOD: 'food',
  SHARE: 'share',
  REQUEST: 'request',
} as const;

export type ProductTypeValue = typeof ProductType[keyof typeof ProductType];

/**
 * Product status states
 */
export const ProductStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  CLAIMED: 'claimed',
} as const;

export type ProductStatusType = typeof ProductStatus[keyof typeof ProductStatus];

// ============================================================================
// Notifications
// ============================================================================

/**
 * Notification frequency options
 */
export const NotificationFrequency = {
  INSTANT: 'instant',
  DAILY_DIGEST: 'daily_digest',
  WEEKLY_DIGEST: 'weekly_digest',
} as const;

export type NotificationFrequencyType = typeof NotificationFrequency[keyof typeof NotificationFrequency];

/**
 * Notification types
 */
export const NotificationType = {
  CHAT_MESSAGE: 'chat_message',
  NEW_LISTING: 'new_listing',
  REVIEW_REMINDER: 'review_reminder',
  SYSTEM: 'system',
} as const;

export type NotificationTypeValue = typeof NotificationType[keyof typeof NotificationType];

// ============================================================================
// Feedback
// ============================================================================

/**
 * Feedback types for user submissions
 */
export const FeedbackType = {
  GENERAL: 'general',
  BUG: 'bug',
  FEATURE: 'feature',
  COMPLAINT: 'complaint',
} as const;

export type FeedbackTypeValue = typeof FeedbackType[keyof typeof FeedbackType];

/**
 * Feedback status for admin tracking
 */
export const FeedbackStatus = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export type FeedbackStatusType = typeof FeedbackStatus[keyof typeof FeedbackStatus];

// ============================================================================
// Chat
// ============================================================================

/**
 * Chat message status
 */
export const MessageStatus = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
} as const;

export type MessageStatusType = typeof MessageStatus[keyof typeof MessageStatus];

/**
 * Chat room status
 */
export const ChatStatus = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  BLOCKED: 'blocked',
} as const;

export type ChatStatusType = typeof ChatStatus[keyof typeof ChatStatus];

// ============================================================================
// User
// ============================================================================

/**
 * User roles in the system
 */
export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  VOLUNTEER: 'volunteer',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

/**
 * User verification status
 */
export const VerificationStatus = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type VerificationStatusType = typeof VerificationStatus[keyof typeof VerificationStatus];

// ============================================================================
// Loading States
// ============================================================================

/**
 * Generic async operation status
 */
export const AsyncStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type AsyncStatusType = typeof AsyncStatus[keyof typeof AsyncStatus];
