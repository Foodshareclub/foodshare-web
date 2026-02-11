import { cn } from "@/lib/utils";

interface ProfileSkeletonProps {
  className?: string;
}

/**
 * Profile page skeleton with cover, avatar, and content
 */
export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-muted/30 dark:bg-background", className)}>
      <div className="container mx-auto max-w-4xl pt-24 pb-12 px-4">
        <div className="glass rounded-xl p-0 overflow-hidden">
          {/* Cover image */}
          <div className="h-[200px] bg-muted animate-pulse" />
          <div className="p-8 space-y-4">
            {/* Avatar */}
            <div className="h-24 w-24 mx-auto rounded-full bg-muted animate-pulse -mt-12" />
            {/* Name */}
            <div className="h-8 bg-muted animate-pulse rounded max-w-xs mx-auto" />
            {/* Subtitle */}
            <div className="h-4 bg-muted animate-pulse rounded max-w-sm mx-auto" />
            {/* Bio */}
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for profile page sections that depend on auth state.
 * Displayed while user session and volunteer role data is loading.
 */
export function ProfileUserSkeleton() {
  return (
    <div className="animate-pulse space-y-4 mt-6">
      {/* Volunteer badge placeholder */}
      <div className="flex justify-center">
        <div className="h-8 w-32 bg-muted rounded-full" />
      </div>
      {/* Action buttons placeholder */}
      <div className="flex justify-center gap-3 mt-4">
        <div className="h-10 w-28 bg-muted rounded-lg" />
        <div className="h-10 w-28 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
