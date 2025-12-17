import { NavbarSkeleton } from "./NavbarSkeleton";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { cn } from "@/lib/utils";

interface ProductGridSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Number of columns at xl breakpoint */
  columns?: number;
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
  columns = 5,
  showNavbar = true,
  className,
}: ProductGridSkeletonProps) {
  const gridCols =
    {
      3: "lg:grid-cols-3",
      4: "lg:grid-cols-4",
      5: "lg:grid-cols-4 xl:grid-cols-5",
    }[columns] ?? "lg:grid-cols-4 xl:grid-cols-5";

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {showNavbar && <NavbarSkeleton />}
      <div className={cn("grid gap-10 px-7 py-7 xl:px-20 grid-cols-1 sm:grid-cols-2", gridCols)}>
        {[...Array(count)].map((_, i) => (
          <SkeletonCard key={i} isLoaded={false} />
        ))}
      </div>
    </div>
  );
}
