'use client'

import { useEffect } from 'react'

/**
 * Root Error Boundary Component
 * Catches and displays errors that occur in the application
 * Provides reset functionality to attempt recovery
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="glass-prominent rounded-3xl p-8 md:p-12">
          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 rounded-full mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-lg text-muted-foreground">
              We encountered an unexpected error. Don't worry, we're on it!
            </p>
          </div>

          {/* Error Details */}
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">🐛</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Error Details:</p>
                  <p className="text-sm text-red-700 dark:text-red-400 break-words font-mono">
                    {error.message || 'An unexpected error occurred'}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-red-600 dark:text-red-500 mt-2">
                      Error ID: {error.digest}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-[#FF2D55] hover:bg-[#E6284D] text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#FF2D55] focus:ring-offset-2"
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-lg font-semibold hover:border-foreground/50 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
            >
              Go Home
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              If this problem persists, please contact support or try refreshing the page.
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Error occurred at: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
