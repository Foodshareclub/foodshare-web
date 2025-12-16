/**
 * Type Guards for Email System
 * Runtime validation for email-related types
 */

import type { EmailProvider, EmailType } from "./types";

/**
 * Valid email providers
 */
const VALID_PROVIDERS: readonly EmailProvider[] = ["resend", "brevo", "mailersend", "aws_ses"];

/**
 * Valid email types
 */
const VALID_EMAIL_TYPES: readonly EmailType[] = [
  "auth",
  "chat",
  "food_listing",
  "feedback",
  "review_reminder",
  "newsletter",
  "announcement",
];

/**
 * Type guard to check if a value is a valid EmailProvider
 */
export function isEmailProvider(value: unknown): value is EmailProvider {
  return typeof value === "string" && VALID_PROVIDERS.includes(value as EmailProvider);
}

/**
 * Type guard to check if a value is a valid EmailType
 */
export function isEmailType(value: unknown): value is EmailType {
  return typeof value === "string" && VALID_EMAIL_TYPES.includes(value as EmailType);
}

/**
 * Asserts that a value is a valid EmailProvider, throwing if not
 */
export function assertEmailProvider(value: unknown): asserts value is EmailProvider {
  if (!isEmailProvider(value)) {
    throw new Error(`Invalid email provider: ${String(value)}`);
  }
}

/**
 * Asserts that a value is a valid EmailType, throwing if not
 */
export function assertEmailType(value: unknown): asserts value is EmailType {
  if (!isEmailType(value)) {
    throw new Error(`Invalid email type: ${String(value)}`);
  }
}

/**
 * Safely coerce a value to EmailProvider with fallback
 */
export function toEmailProvider(value: unknown, fallback: EmailProvider = "resend"): EmailProvider {
  return isEmailProvider(value) ? value : fallback;
}

/**
 * Safely coerce a value to EmailType with fallback
 */
export function toEmailType(value: unknown, fallback: EmailType = "auth"): EmailType {
  return isEmailType(value) ? value : fallback;
}
