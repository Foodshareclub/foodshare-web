/**
 * Auth Module - Single Source of Truth
 * Centralized authentication exports
 * Following ultrathink principles: simple, clear, maintainable
 */

// Core auth API
export { auth } from "./api";
export { supabase, isStorageHealthy } from "./client";

// Types
export type {
  AuthProvider,
  OtpType,
  AuthCredentials,
  SignUpData,
  AuthResult,
  AuthState,
  LoginResult,
  UseAuthReturn,
} from "./types";

// Error handling utilities
export {
  getAuthErrorMessage,
  sanitizeErrorMessage,
  isNetworkError,
  isAuthError,
  getErrorSuggestion,
} from "@/lib/errors";

// Session management
export { getSession, refreshSession, clearSession } from "./session";

// Session management utilities
export { sessionManager, initializeSessionManagement } from "./session";

// Backward compatibility aliases for migration
import type { AuthProvider, OtpType } from "./types";
export type ProviderType = AuthProvider;
export type MobileOtpType = OtpType;

// Extended auth payload with optional fields
export interface AuthPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  rememberMe?: boolean;
}
