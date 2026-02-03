/**
 * GenericErrorBoundary - Unified error boundary component
 * Consolidates AppErrorBoundary, StorageErrorBoundary, and EmailCRMErrorBoundary
 */

import type { ReactNode, ErrorInfo } from "react";
import React, { Component } from "react";
import { Button } from "@/components/ui/button";
import { detectStorageError, clearSupabaseStorage } from "@/utils/storageErrorHandler";

// ============================================================================
// Types
// ============================================================================

type ErrorType = "generic" | "storage" | "network" | "auth";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI */
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Error types to catch (default: all) */
  catchTypes?: ErrorType[];
  /** Show detailed error in development */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  errorCount: number;
  isRecovering: boolean;
}

// ============================================================================
// Error Detection
// ============================================================================

function detectErrorType(error: Error): ErrorType {
  // Check for storage errors
  if (detectStorageError(error)) {
    return "storage";
  }

  // Check for network errors
  if (
    error.message.includes("fetch") ||
    error.message.includes("network") ||
    error.name === "NetworkError"
  ) {
    return "network";
  }

  // Check for auth errors
  if (
    error.message.includes("auth") ||
    error.message.includes("unauthorized") ||
    error.message.includes("session")
  ) {
    return "auth";
  }

  return "generic";
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export class GenericErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: "generic",
      errorCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorType: detectErrorType(error),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorType = detectErrorType(error);

    // Check if we should catch this error type
    const { catchTypes } = this.props;
    if (catchTypes && !catchTypes.includes(errorType)) {
      throw error; // Re-throw if not in catch list
    }

    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }));

    // Call error callback
    this.props.onError?.(error, errorInfo);

    // Log in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  reloadPage = () => {
    window.location.reload();
  };

  clearCacheAndReload = async () => {
    this.setState({ isRecovering: true });
    try {
      // Auth key patterns that must be preserved
      const authPatterns = [
        "auth-token",
        "auth_token",
        "access_token",
        "refresh_token",
        "session",
        "pkce",
        "code_verifier",
        "sb-", // Supabase auth cookies use sb- prefix
      ];

      const isAuthKey = (key: string): boolean => {
        const lowerKey = key.toLowerCase();
        return authPatterns.some((pattern) => lowerKey.includes(pattern));
      };

      // Clear non-auth localStorage keys only
      const keysToRemove = Object.keys(localStorage).filter((key) => !isAuthKey(key));
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear sessionStorage (doesn't contain auth tokens)
      sessionStorage.clear();

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  handleStorageRecovery = async () => {
    this.setState({ isRecovering: true });
    try {
      const success = await clearSupabaseStorage();
      if (success) {
        window.location.reload();
      } else {
        alert("Failed to clear storage. Please manually clear your browser cache.");
      }
    } catch {
      alert("Failed to clear storage. Please manually clear your browser cache.");
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  override render() {
    const { hasError, error, errorInfo, errorType, errorCount, isRecovering } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === "development" } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback(error, errorInfo!, this.resetError);
    }

    // Default error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
        <div className="max-w-lg w-full bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {errorType === "storage" ? "💾" : errorType === "network" ? "🌐" : "💥"}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {errorType === "storage"
                    ? "Storage Error"
                    : errorType === "network"
                      ? "Network Error"
                      : "Something went wrong"}
                </h1>
                <p className="text-red-100 text-sm mt-1">
                  {errorType === "storage"
                    ? "There was a problem with browser storage"
                    : "Don't worry, you can try to recover"}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Error Message */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-400 font-mono text-sm break-words">
                {error.message || "Unknown error"}
              </p>
            </div>

            {/* Error Count Warning */}
            {errorCount > 1 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                  ⚠️ This error has occurred {errorCount} times. Consider clearing your cache.
                </p>
              </div>
            )}

            {/* Stack Trace (Development) */}
            {showDetails && error.stack && (
              <details className="bg-muted border border-border rounded-lg p-4">
                <summary className="font-semibold cursor-pointer">🔍 Stack Trace</summary>
                <pre className="mt-3 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={this.resetError} className="flex-1">
                🔄 Try Again
              </Button>
              <Button onClick={this.reloadPage} variant="outline" className="flex-1">
                ↻ Reload Page
              </Button>
            </div>

            {/* Storage-specific recovery */}
            {errorType === "storage" && (
              <Button
                onClick={this.handleStorageRecovery}
                variant="destructive"
                className="w-full"
                disabled={isRecovering}
              >
                {isRecovering ? "Clearing..." : "🧹 Clear Storage & Reload"}
              </Button>
            )}

            {/* Clear cache option */}
            {errorCount > 1 && (
              <Button
                onClick={this.clearCacheAndReload}
                variant="secondary"
                className="w-full"
                disabled={isRecovering}
              >
                🧹 Clear All Cache & Reload
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

// ============================================================================
// HOC for functional components
// ============================================================================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): React.FC<P> {
  return function WrappedComponent(props: P) {
    return (
      <GenericErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </GenericErrorBoundary>
    );
  };
}

export default GenericErrorBoundary;
