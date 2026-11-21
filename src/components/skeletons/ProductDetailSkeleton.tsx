import { LISTING_CONTAINER } from "@/components/productCard/listing-layout";
import { cn } from "@/lib/utils";
import { NavbarSkeleton } from "./NavbarSkeleton";

interface ProductDetailSkeletonProps {
  className?: string;
  /** The page route already renders the header; the route-level loading state does not. */
  withNavbar?: boolean;
}

/**
 * Product detail page skeleton: title block, photo mosaic, content column and action card.
 */
export function ProductDetailSkeleton({ className, withNavbar = true }: ProductDetailSkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {withNavbar && <NavbarSkeleton />}
      <div
        className={cn(LISTING_CONTAINER, "max-w-[1120px] animate-pulse py-6 motion-reduce:animate-none sm:py-8")}
        aria-hidden="true"
      >
        <div className="mb-6 space-y-3">
          <div className="h-5 w-24 rounded-full bg-muted" />
          <div className="h-8 w-2/3 rounded-md bg-muted" />
          <div className="h-4 w-1/3 rounded-md bg-muted" />
        </div>
        <div className="aspect-[4/3] rounded-2xl bg-muted md:aspect-[2/1]" />
        <div className="mt-6 grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-8">
            {["a", "b", "c"].map((key) => (
              <div key={key} className="space-y-3 border-t border-border pt-6">
                <div className="h-6 w-32 rounded-md bg-muted" />
                <div className="h-4 rounded-md bg-muted" />
                <div className="h-4 w-3/4 rounded-md bg-muted" />
              </div>
            ))}
          </div>
          <div className="hidden h-56 rounded-xl bg-muted lg:block" />
        </div>
      </div>
    </div>
  );
}
