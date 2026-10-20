/**
 * Validation Constants — Single Source of Truth
 *
 * AUTO-SYNCED with Swift FoodshareCore validators:
 * - foodshare-core/Sources/FoodshareCore/Validation/ListingValidator.swift
 * - foodshare-core/Sources/FoodshareCore/Validation/ProfileValidator.swift
 * - foodshare-core/Sources/FoodshareCore/Validation/ReviewValidator.swift
 * - foodshare-core/Sources/FoodshareCore/Validation/AuthValidator.swift
 *
 * IMPORTANT: Update this file when Swift validation constants change.
 * These values must match iOS, Android, and Web clients.
 *
 * Extracted from `_shared/validation-rules.ts` — no value changes.
 */

export const LISTING = {
  title: {
    minLength: 3,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
  quantity: {
    min: 1,
  },
  expiration: {
    maxDays: 30,
  },
} as const;

export const PROFILE = {
  nickname: {
    minLength: 2,
    maxLength: 50,
  },
  bio: {
    maxLength: 300,
  },
} as const;

export const REVIEW = {
  rating: {
    min: 1,
    max: 5,
  },
  comment: {
    maxLength: 500,
  },
} as const;

export const AUTH = {
  password: {
    minLength: 8,
    maxLength: 128,
  },
  email: {
    // RFC 5322 compliant email pattern
    pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  },
} as const;

export const VALIDATION = {
  listing: LISTING,
  profile: PROFILE,
  review: REVIEW,
  auth: AUTH,
} as const;

// =============================================================================
// Error Messages (matching Swift ValidationError messages)
// =============================================================================

export const ERROR_MESSAGES = {
  // Listing errors
  titleEmpty: "Title is required",
  titleTooShort: (min: number) => `Title must be at least ${min} characters`,
  titleTooLong: (max: number) => `Title cannot exceed ${max} characters`,
  descriptionEmpty: "Description is required",
  descriptionTooLong: (max: number) => `Description cannot exceed ${max} characters`,
  invalidQuantity: "Quantity must be at least 1",
  expirationInPast: "Expiration date cannot be in the past",
  expirationTooFarFuture: (days: number) =>
    `Expiration date cannot be more than ${days} days from now`,

  // Profile errors
  displayNameEmpty: "Display name is required",
  displayNameTooShort: (min: number) => `Display name must be at least ${min} characters`,
  displayNameTooLong: (max: number) => `Display name cannot exceed ${max} characters`,
  bioTooLong: (max: number) => `Bio cannot exceed ${max} characters`,

  // Review errors
  invalidRating: (min: number, max: number) => `Rating must be between ${min} and ${max}`,
  commentTooLong: (max: number) => `Comment cannot exceed ${max} characters`,
  missingReviewee: "Missing user to review",
  alreadyReviewed: "You have already reviewed this transaction",
  cannotReviewSelf: "You cannot review yourself",

  // Auth errors
  emailRequired: "Email is required",
  emailInvalid: "Please enter a valid email address",
  passwordRequired: "Password is required",
  passwordTooShort: (min: number) => `Password must be at least ${min} characters`,
  passwordTooLong: (max: number) => `Password cannot exceed ${max} characters`,
} as const;
