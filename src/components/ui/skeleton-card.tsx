import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "product" | "profile" | "stat";
}

export function SkeletonCard({ className, variant = "product" }: SkeletonCardProps) {
  if (variant === "profile") {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="flex items-center gap-4">
          <div className="size-16 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "stat") {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="space-y-3">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border border-border/50 bg-card", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="absolute inset-0 bg-muted animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
      </div>
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
