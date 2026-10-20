import { cn } from "@/lib/utils";
import { NavbarSkeleton } from "./NavbarSkeleton";

// Pool of stable placeholder ids; `count` only ever needs a small subset of these.
const CARD_CONTENT_SKELETON_KEYS = Array.from({ length: 24 }, (_, i) => `card-skeleton-${i}`);

interface PageSkeletonProps {
  /** Show navbar skeleton */
  showNavbar?: boolean;
  /** Navbar height */
  navbarHeight?: number;
  /** Children content */
  children?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Generic page skeleton wrapper
 */
export function PageSkeleton({ showNavbar = true, navbarHeight = 140, children, className }: PageSkeletonProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {showNavbar && <NavbarSkeleton height={navbarHeight} />}
      {children}
    </div>
  );
}

/**
 * Simple centered loading skeleton
 */
export function CenteredLoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 animate-pulse">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted" />
        <div className="h-4 w-32 mx-auto bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Card-based content skeleton
 */
export function CardContentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={CARD_CONTENT_SKELETON_KEYS[i]} className="p-6 bg-card border border-border rounded-lg">
          <div className="h-5 bg-muted rounded w-1/3 mb-3" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
