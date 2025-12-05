'use client'

import { useEffect } from 'react'
import { GlassCard } from '@/components/Glass'
import Link from 'next/link'

/**
 * Products Error Boundary Component
 * Handles errors specific to the products section
 */
export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Products page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
        </div>
      </div>

      {/* Error Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <GlassCard variant="prominent" borderRadius="24px" className="p-8">
            {/* Error Icon */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Couldn't Load Products
              </h2>
              <p className="text-muted-foreground">
                We had trouble loading the product listings. This might be a temporary issue.
              </p>
            </div>

            {/* Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0">🔍</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-orange-800 mb-1">
                        Development Mode - Error Details:
                      </p>
                      <p className="text-xs text-orange-700 break-words font-mono">
                        {error.message}
                      </p>
                      {error.digest && (
                        <p className="text-xs text-orange-600 mt-1">ID: {error.digest}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Helpful Suggestions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                You can try:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Refreshing the page or trying again</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Checking your internet connection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Browsing different product categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Coming back in a few minutes</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 px-6 py-3 bg-[#FF2D55] hover:bg-[#E6284D] text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#FF2D55] focus:ring-offset-2"
              >
                🔄 Try Again
              </button>
              <Link
                href="/"
                className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-lg font-semibold hover:border-foreground/50 hover:shadow-md transition-all text-center focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
              >
                🏠 Go Home
              </Link>
            </div>
          </GlassCard>

          {/* Quick Links */}
          <div className="mt-6">
            <GlassCard variant="subtle" borderRadius="16px" className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Browse by Category:
              </h3>
              <div className="flex flex-wrap gap-2">
                {['food', 'things', 'borrow', 'wanted', 'foodbanks', 'fridges'].map(
                  (category) => (
                    <Link
                      key={category}
                      href={`/food?type=${category}`}
                      className="px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm transition-all capitalize"
                    >
                      {category}
                    </Link>
                  )
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
