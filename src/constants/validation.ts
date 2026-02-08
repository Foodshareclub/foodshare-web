/**
 * Validation Constants - Web App Mirror
 *
 * Synced from backend: foodshare-backend/supabase/functions/_shared/validation-rules.ts
 *
 * IMPORTANT: Keep these values in sync with the backend.
 * These values must match iOS, Android, and Web clients.
 */

// =============================================================================
// Listing Validation
// =============================================================================

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

// =============================================================================
// Profile Validation
// =============================================================================

export const PROFILE = {
  nickname: {
    minLength: 2,
    maxLength: 50,
  },
  bio: {
    maxLength: 300,
  },
} as const;

// =============================================================================
// Review Validation
// =============================================================================

export const REVIEW = {
  rating: {
    min: 1,
    max: 5,
  },
  comment: {
    maxLength: 500,
  },
} as const;

// =============================================================================
// Auth Validation
// =============================================================================

export const AUTH = {
  password: {
    minLength: 8,
    maxLength: 128,
  },
  email: {
    pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  },
} as const;

// =============================================================================
// Aggregate Export
// =============================================================================

export const VALIDATION = {
  listing: LISTING,
  profile: PROFILE,
  review: REVIEW,
  auth: AUTH,
} as const;

// =============================================================================
// Error Messages (matching backend ERROR_MESSAGES)
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

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

export function validateListing(
  title: string,
  description: string,
  quantity: number = 1,
  expiresAt?: Date
): ValidationResult {
  const errors: string[] = [];
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  if (!trimmedTitle) {
    errors.push(ERROR_MESSAGES.titleEmpty);
  } else if (trimmedTitle.length < LISTING.title.minLength) {
    errors.push(ERROR_MESSAGES.titleTooShort(LISTING.title.minLength));
  } else if (trimmedTitle.length > LISTING.title.maxLength) {
    errors.push(ERROR_MESSAGES.titleTooLong(LISTING.title.maxLength));
  }

  if (trimmedDescription.length > LISTING.description.maxLength) {
    errors.push(ERROR_MESSAGES.descriptionTooLong(LISTING.description.maxLength));
  }

  if (quantity < LISTING.quantity.min) {
    errors.push(ERROR_MESSAGES.invalidQuantity);
  }

  if (expiresAt) {
    const now = new Date();
    if (expiresAt < now) {
      errors.push(ERROR_MESSAGES.expirationInPast);
    } else {
      const maxExpiration = new Date(now);
      maxExpiration.setDate(maxExpiration.getDate() + LISTING.expiration.maxDays);
      if (expiresAt > maxExpiration) {
        errors.push(ERROR_MESSAGES.expirationTooFarFuture(LISTING.expiration.maxDays));
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateProfile(
  nickname: string | null | undefined,
  bio: string | null | undefined
): ValidationResult {
  const errors: string[] = [];

  if (nickname) {
    const trimmed = nickname.trim();
    if (trimmed) {
      if (trimmed.length < PROFILE.nickname.minLength) {
        errors.push(ERROR_MESSAGES.displayNameTooShort(PROFILE.nickname.minLength));
      } else if (trimmed.length > PROFILE.nickname.maxLength) {
        errors.push(ERROR_MESSAGES.displayNameTooLong(PROFILE.nickname.maxLength));
      }
    }
  }

  if (bio) {
    const trimmed = bio.trim();
    if (trimmed.length > PROFILE.bio.maxLength) {
      errors.push(ERROR_MESSAGES.bioTooLong(PROFILE.bio.maxLength));
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function validateReview(
  rating: number,
  comment?: string | null,
  revieweeId?: string | null
): ValidationResult {
  const errors: string[] = [];

  if (rating < REVIEW.rating.min || rating > REVIEW.rating.max) {
    errors.push(ERROR_MESSAGES.invalidRating(REVIEW.rating.min, REVIEW.rating.max));
  }

  if (comment) {
    const trimmed = comment.trim();
    if (trimmed.length > REVIEW.comment.maxLength) {
      errors.push(ERROR_MESSAGES.commentTooLong(REVIEW.comment.maxLength));
    }
  }

  if (revieweeId !== undefined && revieweeId !== null && !revieweeId) {
    errors.push(ERROR_MESSAGES.missingReviewee);
  }

  return { isValid: errors.length === 0, errors };
}

export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return AUTH.email.pattern.test(trimmed);
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (!password) {
    errors.push(ERROR_MESSAGES.passwordRequired);
  } else if (password.length < AUTH.password.minLength) {
    errors.push(ERROR_MESSAGES.passwordTooShort(AUTH.password.minLength));
  } else if (password.length > AUTH.password.maxLength) {
    errors.push(ERROR_MESSAGES.passwordTooLong(AUTH.password.maxLength));
  }

  return { isValid: errors.length === 0, errors };
}
