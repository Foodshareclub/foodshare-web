import { Skeleton } from "@/components/ui/skeleton";

const FEATURED_SKELETON_KEYS = ["f-1", "f-2", "f-3"] as const;
const FILTER_SKELETON_KEYS = ["filter-1", "filter-2", "filter-3", "filter-4"] as const;
const GRID_SKELETON_KEYS = ["g-1", "g-2", "g-3", "g-4", "g-5", "g-6"] as const;

export default function ChallengeLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="h-80 bg-gradient-to-br from-primary/10 via-teal-500/10 to-orange-500/10 animate-pulse" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured section skeleton */}
        <div className="mb-12">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURED_SKELETON_KEYS.map((skeletonKey) => (
              <Skeleton key={skeletonKey} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-2 mb-8">
          {FILTER_SKELETON_KEYS.map((skeletonKey) => (
            <Skeleton key={skeletonKey} className="h-10 w-32 rounded-full" />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {GRID_SKELETON_KEYS.map((skeletonKey) => (
            <div key={skeletonKey} className="rounded-2xl border border-border overflow-hidden">
              <Skeleton className="h-48" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
