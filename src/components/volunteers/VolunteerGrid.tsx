"use client";

import { useEffect, useRef } from "react";
import { VolunteerPostcard } from "./VolunteerPostcard";
import type { InitialProductStateType } from "@/types/product.types";

interface VolunteerGridProps {
  volunteers: InitialProductStateType[];
  isLoading?: boolean;
  /** Optional founder profile ID to show as featured */
  founderId?: string;
  /** Callback to load more items (for infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more items are being fetched */
  isFetchingMore?: boolean;
  /** Whether there are more items to load */
  hasMore?: boolean;
}

// Pre-computed skeleton array
const SKELETON_ITEMS = Array.from({ length: 8 }, (_, i) => i);
const LOADING_MORE_SKELETONS = Array.from({ length: 4 }, (_, i) => i);

/**
 * VolunteerGrid - Displays volunteers in a responsive grid with infinite scroll
 * Uses Tailwind responsive classes for grid columns:
 * - Mobile: 1 column
 * - sm (640px): 2 columns
 * - md (768px): 3 columns
 * - lg (1024px): 4 columns
 * - xl (1280px): 5 columns
 */
export function VolunteerGrid({
  volunteers,
  isLoading = false,
  founderId,
  onLoadMore,
  isFetchingMore = false,
  hasMore = false,
}: VolunteerGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, hasMore, isFetchingMore]);

  // Sort volunteers: featured (founder) first, then by creation date
  const sortedVolunteers = [...volunteers].sort((a, b) => {
    if (founderId) {
      if (a.profile_id === founderId) return -1;
      if (b.profile_id === founderId) return 1;
    }
    return 0; // Keep original order (already sorted by creation date)
  });

  return (
    <div
      className="overflow-y-auto"
      style={{ transform: "translateZ(0)", WebkitOverflowScrolling: "touch" }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 page-px py-7">
        {isLoading
          ? SKELETON_ITEMS.map((i) => <VolunteerCardSkeleton key={i} />)
          : sortedVolunteers.map((volunteer) => (
              <VolunteerPostcard
                key={volunteer.id}
                volunteer={volunteer}
                isFeatured={founderId ? volunteer.profile_id === founderId : false}
              />
            ))}

        {/* Loading more skeletons */}
        {isFetchingMore &&
          LOADING_MORE_SKELETONS.map((i) => <VolunteerCardSkeleton key={`loading-more-${i}`} />)}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}

      {/* Empty state */}
      {!isLoading && volunteers.length === 0 && (
        <div className="text-center py-16 page-px">
          <div className="text-6xl mb-4">🙌</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No volunteers yet</h3>
          <p className="text-muted-foreground">Be the first to join our volunteer community!</p>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton placeholder for volunteer card while loading
 */
function VolunteerCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      {/* Avatar skeleton */}
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 rounded-full bg-muted" />
      </div>

      {/* Name skeleton */}
      <div className="flex justify-center mb-2">
        <div className="h-5 w-32 bg-muted rounded" />
      </div>

      {/* Headline skeleton */}
      <div className="flex justify-center mb-4">
        <div className="h-4 w-40 bg-muted rounded" />
      </div>

      {/* Skills skeleton */}
      <div className="flex justify-center gap-2 mb-4">
        <div className="h-6 w-16 bg-muted rounded-full" />
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 my-3" />

      {/* Location & Availability skeleton */}
      <div className="flex justify-between">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}

export default VolunteerGrid;
