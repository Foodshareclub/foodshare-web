/**
 * App Error Boundary
 * Catches all React errors and provides detailed debugging information
 * Prevents white screen of death in production
 */

import type { ReactNode } from 'react';
import React, { Component } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AppErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with full context
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorCount: this.state.errorCount + 1,
    });

    // Store error info in state
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  /**
   * Report error to external service (Sentry, LogRocket, etc.)
   */
  private reportErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Store in localStorage for debugging
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        errorCount: this.state.errorCount,
      };

      localStorage.setItem(`app_error_${Date.now()}`, JSON.stringify(errorLog));

      // TODO: Send to your error tracking service
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }

  /**
   * Reset error boundary
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the application
   */
  reloadApp = () => {
    window.location.reload();
  };

  /**
   * Clear cache and reload
   */
  clearCacheAndReload = async () => {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
      }
      
      // Clear service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Reload
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      window.location.reload();
    }
  };

  /**
   * Copy error details to clipboard
   */
  copyErrorDetails = () => {
    const { error, errorInfo } = this.state;
    const details = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    navigator.clipboard.writeText(JSON.stringify(details, null, 2))
      .then(() => alert('Error details copied to clipboard'))
      .catch(() => alert('Failed to copy error details'));
  };

  override render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, errorInfo!, this.resetError);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-4">
          <div className="max-w-2xl w-full bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="text-4xl">💥</div>
                <div>
                  <h1 className="text-2xl font-bold">Oops! Something went wrong</h1>
                  <p className="text-red-100 text-sm mt-1">
                    Don't worry, we've logged this error and you can try to recover
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6 space-y-4">
              {/* Error Message */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-2">Error Message:</h3>
                <p className="text-red-700 dark:text-red-400 font-mono text-sm break-words">
                  {error.message || 'Unknown error'}
                </p>
              </div>

              {/* Error Count Warning */}
              {errorCount > 1 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                    ⚠️ This error has occurred {errorCount} times. Consider clearing your cache.
                  </p>
                </div>
              )}

              {/* Stack Trace (Development only) */}
              {process.env.NODE_ENV === 'development' && error.stack && (
                <details className="bg-muted border border-border rounded-lg p-4">
                  <summary className="font-semibold text-foreground cursor-pointer hover:text-foreground/80">
                    🔍 Stack Trace (Development)
                  </summary>
                  <pre className="mt-3 text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                </details>
              )}

              {/* Component Stack (Development only) */}
              {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                <details className="bg-muted border border-border rounded-lg p-4">
                  <summary className="font-semibold text-foreground cursor-pointer hover:text-foreground/80">
                    🧩 Component Stack (Development)
                  </summary>
                  <pre className="mt-3 text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap break-words">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={this.resetError}
                  className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                >
                  🔄 Try Again
                </button>
                
                <button
                  onClick={this.reloadApp}
                  className="flex-1 bg-muted text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-muted/80 transition-all border border-border"
                >
                  ↻ Reload Page
                </button>
              </div>

              {/* Advanced Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.clearCacheAndReload}
                  className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-all border border-yellow-200 dark:border-yellow-800"
                >
                  🧹 Clear Cache & Reload
                </button>
                
                <button
                  onClick={this.copyErrorDetails}
                  className="flex-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all border border-blue-200 dark:border-blue-800"
                >
                  📋 Copy Error Details
                </button>
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 What can you do?</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>Try clicking "Try Again" to recover without reloading</li>
                  <li>Reload the page to start fresh</li>
                  <li>Clear your cache if the error persists</li>
                  <li>Copy error details and report to support if needed</li>
                </ul>
              </div>

              {/* Production Note */}
              {process.env.NODE_ENV === 'production' && (
                <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
                  Error ID: {Date.now()} • This error has been automatically logged
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default AppErrorBoundary;
