import { cn } from "@/lib/utils";

interface NavbarSkeletonProps {
  height?: number;
  className?: string;
}

/**
 * Navbar skeleton for page loading states
 */
export function NavbarSkeleton({ height = 140, className }: NavbarSkeletonProps) {
  return (
    <div
      className={cn("bg-card border-b border-border animate-pulse", className)}
      style={{ height: `${height}px` }}
    />
  );
}
