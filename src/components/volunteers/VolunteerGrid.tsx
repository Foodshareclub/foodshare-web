"use client";

import { Button } from "@/components/ui/button";
import type { InitialProductStateType } from "@/types/product.types";
import { HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { VolunteerPostcard } from "./VolunteerPostcard";

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
      { rootMargin: "200px" },
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
    <div className="overflow-y-auto" style={{ transform: "translateZ(0)", WebkitOverflowScrolling: "touch" }}>
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
        {isFetchingMore && LOADING_MORE_SKELETONS.map((i) => <VolunteerCardSkeleton key={`loading-more-${i}`} />)}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && !isLoading && <div ref={loadMoreRef} className="h-10" aria-hidden="true" />}

      {/* Empty state */}
      {!isLoading && volunteers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-8 sm:p-12 text-center max-w-md w-full shadow-xl">
            <div className="absolute -top-20 -end-20 size-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="flex justify-center mb-6">
              <div className="size-16 rounded-2xl bg-muted/80 border border-border/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <HeartHandshake className="size-8" />
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-2 font-display">
              {"No volunteers yet"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
              {"Be the first to join our community of food heroes and sharers!"}
            </p>
            <Link href="/food/new?type=volunteer">
              <Button
                variant="brand"
                size="lg"
                className="h-12 px-7 rounded-xl font-semibold text-sm shadow-xs hover:shadow-sm transition-all"
              >
                {"Become a Volunteer"}
              </Button>
            </Link>
          </div>
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
    <div className="rounded-3xl border border-border/80 bg-card/60 p-6 animate-pulse flex flex-col justify-between h-[280px]">
      <div>
        {/* Avatar skeleton */}
        <div className="flex justify-center mb-4">
          <div className="size-20 rounded-full bg-muted" />
        </div>

        {/* Name skeleton */}
        <div className="flex justify-center mb-2">
          <div className="h-5 w-32 bg-muted rounded-md" />
        </div>

        {/* Headline skeleton */}
        <div className="flex justify-center mb-4">
          <div className="h-4 w-40 bg-muted rounded-md" />
        </div>

        {/* Skills skeleton */}
        <div className="flex justify-center gap-1.5 mb-4">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-20 bg-muted rounded-full" />
        </div>
      </div>

      <div>
        {/* Divider */}
        <div className="border-t border-border/50 my-3" />

        {/* Location & Availability skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export default VolunteerGrid;
