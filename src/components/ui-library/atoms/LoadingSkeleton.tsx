import { cn } from "@/lib/utils";
import type React from "react";

// Pool of stable placeholder ids; `lines` only ever needs a small subset of these.
const SKELETON_LINE_KEYS = Array.from({ length: 12 }, (_, i) => `skeleton-line-${i}`);

interface LoadingSkeletonProps {
  lines?: number;
  lineWidth?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ lines = 3, lineWidth = 2, className }) => {
  const skeletonWidth = `w-${lineWidth * 10}px`;

  return (
    <div className={cn("animate-bounce", className)} style={{}}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={SKELETON_LINE_KEYS[i]}
          className={cn("block h-8 w-full rounded-md my-2", skeletonWidth, "bg-muted/30")}
        />
      ))}
    </div>
  );
};
