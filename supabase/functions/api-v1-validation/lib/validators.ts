/**
 * Validation Domain Handlers (pure, stateless)
 *
 * Thin zod-parse + domain-validate adapters over `_shared/validation/`.
 * Extracted from `api-v1-validation/index.ts` — no logic changes.
 */

import {
  evaluatePasswordStrength,
  validateEmailEnhanced,
  validateListing,
  validatePassword,
  validateProfile,
  validateReview,
  type ValidationResult,
} from "../../_shared/validation-rules.ts";
import {
  batchSchema,
  emailSchema,
  listingSchema,
  passwordSchema,
  profileSchema,
  reviewSchema,
} from "./schemas.ts";

export function handleValidateListing(body: unknown): ValidationResult {
  const data = listingSchema.parse(body);
  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;

  return validateListing(
    data.title,
    data.description || "",
    data.quantity || 1,
    expiresAt,
  );
}

export function handleValidateProfile(body: unknown): ValidationResult {
  const data = profileSchema.parse(body);
  return validateProfile(data.nickname, data.bio);
}

export function handleValidateReview(body: unknown): ValidationResult {
  const data = reviewSchema.parse(body);
  return validateReview(data.rating, data.comment, data.revieweeId);
}

export function handleValidateEmail(body: unknown): ValidationResult {
  const data = emailSchema.parse(body);
  return validateEmailEnhanced(data.email);
}

export interface PasswordValidationResult extends ValidationResult {
  strength: number;
  strengthLabel: string;
}

export function handleValidatePassword(body: unknown): PasswordValidationResult {
  const data = passwordSchema.parse(body);
  const result = validatePassword(data.password);
  const strength = evaluatePasswordStrength(data.password);

  const strengthLabels = ["None", "Weak", "Medium", "Strong", "Very Strong"];

  return {
    ...result,
    strength,
    strengthLabel: strengthLabels[strength] || "Unknown",
  };
}

export interface BatchValidationItem {
  type: string;
  isValid: boolean;
  errors: string[];
  strength?: number;
  strengthLabel?: string;
}

export function handleBatchValidation(
  body: unknown,
): { results: BatchValidationItem[] } {
  const data = batchSchema.parse(body);

  const results = data.validations.map((item) => {
    try {
      let result: ValidationResult | PasswordValidationResult;

      switch (item.type) {
        case "listing":
          result = handleValidateListing(item.data);
          break;
        case "profile":
          result = handleValidateProfile(item.data);
          break;
        case "review":
          result = handleValidateReview(item.data);
          break;
        case "email":
          result = handleValidateEmail(item.data);
          break;
        case "password":
          result = handleValidatePassword(item.data);
          break;
        default:
          return {
            type: item.type,
            isValid: false,
            errors: [`Unknown validation type: ${item.type}`],
          };
      }

      return { type: item.type, ...result };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return { type: item.type, isValid: false, errors: [err.message] };
    }
  });

  return { results };
}
