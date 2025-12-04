/**
 * Validation utilities
 */

import {
  EMAIL_REGEX,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "../config/constants.ts";

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, error: "Description cannot be empty" };
  }

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      error: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
    };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return {
      valid: false,
      error: `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`,
    };
  }

  return { valid: true };
}

export function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Check if it's a Supabase Storage URL
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.includes("supabase.co") &&
      parsed.pathname.includes("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

export function validateVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function sanitizeText(text: string): string {
  // Remove potential XSS attempts
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}
