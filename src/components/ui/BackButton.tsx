'use client';

/**
 * BackButton - Client component for browser history navigation
 * Extracted to allow parent pages to remain Server Components
 */
export function BackButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.history.back()}
      className={className}
    >
      ← Go Back
    </button>
  );
}
