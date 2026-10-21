/**
 * Email validation utilities
 * Shared across components for consistent email validation
 */

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// RFC 5321 maximum email length
const MAX_EMAIL_LENGTH = 254;

/**
 * Check if an email address is valid
 * Validates format and length per RFC standards
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

/**
 * Validate email and return error message if invalid
 * @param email - Email address to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateEmail(email: string): string {
  if (!email) {
    return "";
  }

  if (!isValidEmail(email)) {
    return "Please enter a valid email address";
  }

  return "";
}
