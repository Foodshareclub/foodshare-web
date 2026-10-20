import { cn } from "@/lib/utils";

interface StatCardSkeletonProps {
  className?: string;
}

/**
 * Single stat card skeleton
 */
export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div className={cn("bg-background p-6 rounded-lg border border-border", className)}>
      <div className="h-4 bg-muted rounded w-24 mb-2 animate-pulse" />
      <div className="h-8 bg-muted rounded w-16 animate-pulse" />
    </div>
  );
}

interface StatsGridSkeletonProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Grid of stat card skeletons
 */
export function StatsGridSkeleton({ count = 4, columns = 4, className }: StatsGridSkeletonProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid grid-cols-1 gap-4", gridCols[columns], className)}>
      {[...Array(count)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
