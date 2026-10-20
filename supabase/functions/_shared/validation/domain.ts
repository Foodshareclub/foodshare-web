/**
 * Domain Validators (listing / profile / review)
 *
 * Extracted from `_shared/validation-rules.ts` — no logic changes.
 */

import { ERROR_MESSAGES, LISTING, PROFILE, REVIEW } from "./constants.ts";
import type { ValidationResult } from "./types.ts";

/**
 * Validate a listing
 */
export function validateListing(
  title: string,
  description: string,
  quantity: number = 1,
  expiresAt?: Date,
): ValidationResult {
  const errors: string[] = [];
  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();

  // Title validation
  if (!trimmedTitle) {
    errors.push(ERROR_MESSAGES.titleEmpty);
  } else if (trimmedTitle.length < LISTING.title.minLength) {
    errors.push(ERROR_MESSAGES.titleTooShort(LISTING.title.minLength));
  } else if (trimmedTitle.length > LISTING.title.maxLength) {
    errors.push(ERROR_MESSAGES.titleTooLong(LISTING.title.maxLength));
  }

  // Description validation
  if (trimmedDescription.length > LISTING.description.maxLength) {
    errors.push(
      ERROR_MESSAGES.descriptionTooLong(LISTING.description.maxLength),
    );
  }

  // Quantity validation
  if (quantity < LISTING.quantity.min) {
    errors.push(ERROR_MESSAGES.invalidQuantity);
  }

  // Expiration validation
  if (expiresAt) {
    const now = new Date();
    if (expiresAt < now) {
      errors.push(ERROR_MESSAGES.expirationInPast);
    } else {
      const maxExpiration = new Date(now);
      maxExpiration.setDate(
        maxExpiration.getDate() + LISTING.expiration.maxDays,
      );
      if (expiresAt > maxExpiration) {
        errors.push(
          ERROR_MESSAGES.expirationTooFarFuture(LISTING.expiration.maxDays),
        );
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate a profile
 */
export function validateProfile(
  nickname: string | null | undefined,
  bio: string | null | undefined,
): ValidationResult {
  const errors: string[] = [];

  // Nickname validation
  if (nickname) {
    const trimmed = nickname.trim();
    if (trimmed) {
      if (trimmed.length < PROFILE.nickname.minLength) {
        errors.push(
          ERROR_MESSAGES.displayNameTooShort(PROFILE.nickname.minLength),
        );
      } else if (trimmed.length > PROFILE.nickname.maxLength) {
        errors.push(
          ERROR_MESSAGES.displayNameTooLong(PROFILE.nickname.maxLength),
        );
      }
    }
  }

  // Bio validation
  if (bio) {
    const trimmed = bio.trim();
    if (trimmed.length > PROFILE.bio.maxLength) {
      errors.push(ERROR_MESSAGES.bioTooLong(PROFILE.bio.maxLength));
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate a review
 */
export function validateReview(
  rating: number,
  comment?: string | null,
  revieweeId?: string | null,
): ValidationResult {
  const errors: string[] = [];

  // Rating validation
  if (rating < REVIEW.rating.min || rating > REVIEW.rating.max) {
    errors.push(
      ERROR_MESSAGES.invalidRating(REVIEW.rating.min, REVIEW.rating.max),
    );
  }

  // Comment validation
  if (comment) {
    const trimmed = comment.trim();
    if (trimmed.length > REVIEW.comment.maxLength) {
      errors.push(ERROR_MESSAGES.commentTooLong(REVIEW.comment.maxLength));
    }
  }

  // Reviewee validation
  if (revieweeId !== undefined && revieweeId !== null && !revieweeId) {
    errors.push(ERROR_MESSAGES.missingReviewee);
  }

  return { isValid: errors.length === 0, errors };
}
