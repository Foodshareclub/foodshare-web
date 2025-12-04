/**
 * Supabase Error Mapper
 * Single source of truth for mapping Supabase/Postgres errors to ErrorCode
 */

import type { ErrorCode, SupabaseError } from "./types";

/**
 * Map Supabase/Postgres error codes to unified ErrorCode
 */
export function mapSupabaseError(error: SupabaseError | string): ErrorCode {
  const code = typeof error === "string" ? error : (error.code || "");
  const message = typeof error === "string" ? "" : (error.message || "").toLowerCase();

  // Network errors
  if (message.includes("network") || message.includes("fetch") || message.includes("timeout")) {
    return "NETWORK_ERROR";
  }

  // Auth/JWT errors
  if (code.startsWith("PGRST") && code.includes("401")) return "AUTH_ERROR";
  if (message.includes("jwt") || message.includes("token") || message.includes("unauthorized")) {
    return "AUTH_ERROR";
  }

  // Not found
  if (code === "PGRST116" || message.includes("not found") || message.includes("no rows")) {
    return "NOT_FOUND";
  }

  // Permission/Forbidden errors
  if (code === "PGRST301" || code === "42501") return "FORBIDDEN";
  if (message.includes("permission") || message.includes("denied")) {
    return "PERMISSION_DENIED";
  }

  // Rate limiting
  if (code === "429" || message.includes("rate limit") || message.includes("too many")) {
    return "RATE_LIMITED";
  }

  // Validation/Constraint errors
  if (
    code === "23505" || // unique_violation
    code === "23503" || // foreign_key_violation
    code === "23502" || // not_null_violation
    code.startsWith("22") || // data_exception
    code.startsWith("23") || // integrity_constraint_violation
    message.includes("invalid") ||
    message.includes("constraint")
  ) {
    return "VALIDATION_ERROR";
  }

  // Server/Database errors
  if (code.startsWith("5") || message.includes("internal") || message.includes("server")) {
    return "SERVER_ERROR";
  }

  // Default to database error for unrecognized Supabase errors
  if (code) {
    return "DATABASE_ERROR";
  }

  return "UNKNOWN_ERROR";
}

/**
 * Check if an error is from Supabase
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}
