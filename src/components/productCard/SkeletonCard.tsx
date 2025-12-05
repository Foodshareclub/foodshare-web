import React from "react";

type PropsSkeletonType = {
  isLoaded: boolean;
};

// React Compiler handles memoization automatically
function SkeletonCard({ isLoaded }: PropsSkeletonType) {
  return (
    <div className="col-span-1">
      {!isLoaded ? (
        <div className="relative rounded-[20px] overflow-hidden shadow-lg glass-shimmer gpu">
          <div style={{ aspectRatio: "4/3" }} className="bg-muted animate-pulse" />
          <div className="p-4 h-[140px] bg-card/70 backdrop-blur-xl backdrop-saturate-150 border-t border-border/20">
            <div className="h-6 bg-muted animate-pulse rounded-lg" />
            <div className="mt-3 h-4 bg-muted animate-pulse rounded-lg" />
            <div className="mt-2 h-4 bg-muted animate-pulse rounded-lg" />
            <div className="mt-2 h-4 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="relative rounded-[20px] overflow-hidden shadow-lg glass-fade-in gpu">
          {/* Placeholder for loaded state - image would be passed as prop */}
          <div
            className="w-full bg-muted"
            style={{ aspectRatio: "4/3" }}
            role="img"
            aria-label="Product image placeholder"
          />
          <div className="p-4 h-[140px] bg-card/70 backdrop-blur-xl backdrop-saturate-150 border-t border-border/20">
            <div className="h-6" />
            <div className="mt-3 h-4" />
            <div className="mt-2 h-4" />
            <div className="mt-2 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export default SkeletonCard;
