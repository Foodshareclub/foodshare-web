'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Profile Detail Error Boundary Component
 * Handles errors when loading user profile
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Profile error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-xl p-8 text-center border border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <span className="text-3xl">👤</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Profile Not Found
        </h1>

        <p className="text-muted-foreground mb-6">
          {error.message || "We couldn't load this profile. The user may not exist or there was a server error."}
        </p>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mb-4">Error ID: {error.digest}</p>
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
            className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
