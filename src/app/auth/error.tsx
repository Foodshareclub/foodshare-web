'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Auth Error Boundary Component
 * Handles errors during authentication flows
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <span className="text-3xl">🔐</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>

        <p className="text-gray-600 mb-6">
          {error.message || "We encountered an issue with authentication. Please try again."}
        </p>

        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">Error ID: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Go Home
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Having trouble? Try clearing your browser cookies or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
