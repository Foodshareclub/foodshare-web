'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Admin Error Boundary Component
 * Handles errors specific to the admin panel
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service with admin context
    console.error('Admin panel error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="glass-prominent rounded-3xl p-8 md:p-12">
          {/* Admin Badge */}
          <div className="flex justify-center mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
              ADMIN PANEL
            </span>
          </div>

          {/* Error Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-100 to-pink-100 rounded-full mb-4">
              <span className="text-4xl">⚡</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Admin Panel Error
            </h1>
            <p className="text-lg text-gray-600">
              An error occurred while processing your admin request
            </p>
          </div>

          {/* Error Details - Always show for admins */}
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">🐛</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800 mb-1">
                      Error Message:
                    </p>
                    <p className="text-sm text-red-700 break-words font-mono">
                      {error.message || 'An unexpected error occurred'}
                    </p>
                  </div>
                </div>

                {error.digest && (
                  <div className="pt-2 border-t border-red-200">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Error ID:</span> {error.digest}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      <span className="font-semibold">Timestamp:</span>{' '}
                      {new Date().toISOString()}
                    </p>
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && error.stack && (
                  <details className="pt-2 border-t border-red-200">
                    <summary className="text-xs font-semibold text-red-800 cursor-pointer hover:text-red-900">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="text-xs text-red-700 mt-2 overflow-x-auto p-2 bg-red-100 rounded">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Troubleshooting Steps:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Check if your admin session is still valid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Verify your permissions for this operation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Ensure the database connection is stable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>Review the error details above for more context</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              🔄 Retry Operation
            </button>
            <Link
              href="/admin"
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all text-center focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              📊 Admin Dashboard
            </Link>
          </div>

          {/* Additional Admin Options */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href="/admin/reports"
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                View Reports
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/admin/email/monitor"
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Email Monitor
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Main Site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
