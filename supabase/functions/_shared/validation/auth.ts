/**
 * Auth Validators (email / password)
 *
 * Extracted from `_shared/validation-rules.ts` — no logic changes.
 */

import { AUTH, ERROR_MESSAGES } from "./constants.ts";
import { PasswordStrength, type ValidationResult } from "./types.ts";

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return AUTH.email.pattern.test(trimmed);
}

/**
 * Validate password
 */
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

/**
 * Evaluate password strength (matching Swift algorithm)
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) return PasswordStrength.None;
  if (password.length < AUTH.password.minLength) return PasswordStrength.Weak;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const strengthScore = [hasUppercase, hasLowercase, hasNumber, hasSpecial]
    .filter(Boolean).length;

  switch (strengthScore) {
    case 0:
    case 1:
      return PasswordStrength.Weak;
    case 2:
      return PasswordStrength.Medium;
    case 3:
      return PasswordStrength.Strong;
    default:
      return PasswordStrength.VeryStrong;
  }
}

/**
 * Enhanced email validation with additional checks
 * - No consecutive dots
 * - Valid domain length
 * - Valid TLD
 */
export function validateEmailEnhanced(email: string): ValidationResult {
  const errors: string[] = [];
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    errors.push(ERROR_MESSAGES.emailRequired);
    return { isValid: false, errors };
  }

  // Basic format check
  if (!AUTH.email.pattern.test(trimmed)) {
    errors.push(ERROR_MESSAGES.emailInvalid);
    return { isValid: false, errors };
  }

  // No consecutive dots
  if (/\.{2,}/.test(trimmed)) {
    errors.push("Email cannot contain consecutive dots");
    return { isValid: false, errors };
  }

  // Check domain part
  const [, domain] = trimmed.split("@");
  if (domain) {
    // Domain length check (max 253 chars per RFC)
    if (domain.length > 253) {
      errors.push("Email domain is too long");
      return { isValid: false, errors };
    }

    // TLD validation (at least 2 chars, no numbers only)
    const tld = domain.split(".").pop() || "";
    if (tld.length < 2 || /^\d+$/.test(tld)) {
      errors.push("Email has invalid top-level domain");
      return { isValid: false, errors };
    }
  }

  return { isValid: true, errors: [] };
}
