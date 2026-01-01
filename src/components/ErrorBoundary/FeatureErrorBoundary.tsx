"use client";

/**
 * Feature-Level Error Boundary
 *
 * Isolates failures to specific features with recovery options.
 *
 * @module components/ErrorBoundary/FeatureErrorBoundary
 */

import React, { Component, type ReactNode, type ErrorInfo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Reset the error boundary */
  resetErrorBoundary: () => void;
  /** Retry the failed action */
  retryAction?: () => void;
  /** Feature name for context */
  featureName?: string;
}

export interface FeatureErrorBoundaryProps {
  /** Child components */
  children: ReactNode;
  /** Feature name for logging */
  featureName?: string;
  /** Custom fallback component */
  fallback?: React.ComponentType<ErrorFallbackProps>;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback when boundary is reset */
  onReset?: () => void;
  /** Keys that trigger reset when changed */
  resetKeys?: unknown[];
  /** Retry action to pass to fallback */
  retryAction?: () => void;
  /** Show minimal fallback (just error message) */
  minimal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// =============================================================================
// Default Fallback Component
// =============================================================================

function DefaultErrorFallback({
  error,
  resetErrorBoundary,
  retryAction,
  featureName,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-red-600 dark:text-red-400 mb-2">
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-1">
        {featureName ? `${featureName} Error` : "Something went wrong"}
      </h3>

      <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center max-w-md">
        {error.message || "An unexpected error occurred"}
      </p>

      <div className="flex gap-2">
        {retryAction && (
          <button
            onClick={retryAction}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        )}

        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          Reset
        </button>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <details className="mt-4 text-xs text-red-500 dark:text-red-400 max-w-full overflow-auto">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-left whitespace-pre-wrap">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}

function MinimalErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
      <span>Error: {error.message}</span>
      <button
        onClick={resetErrorBoundary}
        className="underline hover:no-underline"
      >
        Retry
      </button>
    </div>
  );
}

// =============================================================================
// Error Boundary Component
// =============================================================================

/**
 * Feature-level error boundary with recovery options
 *
 * @example
 * ```tsx
 * <FeatureErrorBoundary
 *   featureName="Product List"
 *   onError={(error) => logError(error)}
 *   retryAction={() => refetch()}
 * >
 *   <ProductList />
 * </FeatureErrorBoundary>
 * ```
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  State
> {
  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, featureName } = this.props;

    // Log error
    console.error(
      `[ErrorBoundary${featureName ? `:${featureName}` : ""}]`,
      error,
      errorInfo
    );

    // Call error callback
    onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: FeatureErrorBoundaryProps): void {
    const { resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset if resetKeys changed
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    const { onReset } = this.props;
    this.setState({ hasError: false, error: null });
    onReset?.();
  };

  override render(): ReactNode {
    const { hasError, error } = this.state;
    const {
      children,
      fallback: FallbackComponent,
      featureName,
      retryAction,
      minimal,
    } = this.props;

    if (hasError && error) {
      const Fallback = FallbackComponent
        ? FallbackComponent
        : minimal
          ? MinimalErrorFallback
          : DefaultErrorFallback;

      return (
        <Fallback
          error={error}
          resetErrorBoundary={this.reset}
          retryAction={retryAction}
          featureName={featureName}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// HOC for wrapping components
// =============================================================================

/**
 * Higher-order component for adding error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  boundaryProps?: Omit<FeatureErrorBoundaryProps, "children">
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <FeatureErrorBoundary {...boundaryProps}>
      <Component {...props} />
    </FeatureErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

// =============================================================================
// Async Error Boundary (for Suspense)
// =============================================================================

interface AsyncErrorBoundaryProps extends FeatureErrorBoundaryProps {
  /** Loading fallback for Suspense */
  loadingFallback?: ReactNode;
}

/**
 * Error boundary that works with React Suspense
 */
export function AsyncErrorBoundary({
  children,
  loadingFallback,
  ...props
}: AsyncErrorBoundaryProps) {
  return (
    <FeatureErrorBoundary {...props}>
      <React.Suspense fallback={loadingFallback || <DefaultLoadingFallback />}>
        {children}
      </React.Suspense>
    </FeatureErrorBoundary>
  );
}

function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default FeatureErrorBoundary;
