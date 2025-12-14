"use client";

/**
 * Post Activity Timeline Skeleton
 *
 * Loading skeleton for the activity timeline.
 * Used with Suspense for streaming.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PostActivityTimelineSkeletonProps {
  count?: number;
  compact?: boolean;
  className?: string;
}

export function PostActivityTimelineSkeleton({
  count = 5,
  compact = false,
  className,
}: PostActivityTimelineSkeletonProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="relative pl-10">
            {/* Icon circle skeleton */}
            <Skeleton className="absolute left-0 w-8 h-8 rounded-full" />

            <div className={cn("bg-card rounded-lg border", compact ? "p-2" : "p-4")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    {!compact && <Skeleton className="h-3 w-1/2" />}
                  </div>
                </div>
                <Skeleton className="h-3 w-16 flex-shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PostActivityTimelineSkeleton;
