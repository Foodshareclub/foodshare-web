import { NavbarSkeleton } from "./NavbarSkeleton";
import { cn } from "@/lib/utils";

interface ProductDetailSkeletonProps {
  className?: string;
}

/**
 * Product detail page skeleton with split view (product + map)
 */
export function ProductDetailSkeleton({ className }: ProductDetailSkeletonProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-muted/30 to-background dark:from-background dark:to-muted/20",
        className
      )}
    >
      <NavbarSkeleton />

      <div className="flex flex-col lg:flex-row">
        {/* Left Column - Product Detail */}
        <div className="w-full lg:w-1/2 px-4 pb-12">
          <div className="animate-pulse">
            <div className="glass w-full overflow-hidden rounded-xl">
              {/* Image with back button */}
              <div className="relative aspect-[16/9] bg-muted">
                <div className="absolute top-4 left-4 h-9 w-20 bg-background/90 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="h-6 bg-muted rounded w-20 mb-3" />
                <div className="h-8 bg-muted rounded mb-3" />
                <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                <hr className="my-4 border-border" />
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-4 bg-muted rounded w-20" />
                </div>
                <hr className="my-4 border-border" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
                <div className="mt-6 h-12 bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Map */}
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0 bg-muted animate-pulse flex items-center justify-center">
          <span className="text-4xl">🗺️</span>
        </div>
      </div>
    </div>
  );
}
