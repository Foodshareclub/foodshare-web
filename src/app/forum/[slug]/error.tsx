"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ForumPostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Forum Post Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <h2 className="text-2xl font-bold mb-2">Failed to load post</h2>
      <p className="text-muted-foreground mb-6">Something went wrong loading this forum post.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/forum"
          className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
        >
          Back to Forum
        </Link>
      </div>
    </div>
  );
}
