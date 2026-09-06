import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  lines?: number;
  lineWidth?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 3,
  lineWidth = 2,
  className,
}) => {
  const skeletonWidth = `w-${lineWidth * 10}px`;

  return (
    <div className={cn("animate-bounce", className)} style={{}}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("block h-8 w-full rounded-md my-2", skeletonWidth, "bg-muted/30")}
        />
      ))}
    </div>
  );
};
