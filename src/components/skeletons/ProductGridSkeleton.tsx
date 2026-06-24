import { NavbarSkeleton } from "./NavbarSkeleton";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { cn } from "@/lib/utils";

interface ProductGridSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Show navbar skeleton */
  showNavbar?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Product grid skeleton for home and food pages
 */
export function ProductGridSkeleton({
  count = 10,
  showNavbar = true,
  className,
}: ProductGridSkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {showNavbar && <NavbarSkeleton />}
      <div className="grid gap-x-6 gap-y-10 px-7 py-7 xl:px-20 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 [@media(min-width:1880px)]:grid-cols-7">
        {[...Array(count)].map((_, i) => (
          <SkeletonCard key={i} isLoaded={false} />
        ))}
      </div>
    </div>
  );
}
