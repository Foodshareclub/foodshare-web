import { NavbarSkeleton } from "./NavbarSkeleton";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "@/components/productCard/listing-layout";
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
      <div className={cn(LISTING_CONTAINER, "py-6 pb-28 sm:py-8 sm:pb-32")}>
        <div className={LISTING_GRID}>
          {Array.from({ length: count }, (_, i) => (
            <SkeletonCard key={i} isLoaded={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
