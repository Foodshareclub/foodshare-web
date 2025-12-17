import { StatsGridSkeleton } from "./StatCardSkeleton";
import { cn } from "@/lib/utils";

interface AdminDashboardSkeletonProps {
  className?: string;
}

/**
 * Admin dashboard skeleton with stats grid and activity sections
 */
export function AdminDashboardSkeleton({ className }: AdminDashboardSkeletonProps) {
  return (
    <div className={cn("flex flex-col gap-6 animate-pulse", className)}>
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>

      {/* Stats Grid Skeleton */}
      <StatsGridSkeleton count={4} columns={4} />

      {/* Additional Stats Skeleton */}
      <StatsGridSkeleton count={3} columns={3} />

      {/* Quick Actions and Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background p-6 rounded-lg border border-border">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="bg-background p-6 rounded-lg border border-border">
          <div className="h-6 bg-muted rounded w-32 mb-4" />
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
