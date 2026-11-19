/**
 * Validation Types
 *
 * Shared result/strength types for domain validators.
 * Extracted from `_shared/validation-rules.ts` — no changes.
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Password strength levels (matching Swift PasswordStrength enum)
 */
export enum PasswordStrength {
  None = 0,
  Weak = 1,
  Medium = 2,
  Strong = 3,
  VeryStrong = 4,
}
