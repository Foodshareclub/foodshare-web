import React from "react";

type PropsSkeletonType = {
  isLoaded: boolean;
};

// React Compiler handles memoization automatically
function SkeletonCard({ isLoaded }: PropsSkeletonType) {
  return (
    <div className="col-span-1">
      {!isLoaded ? (
        <div className="relative rounded-[20px] overflow-hidden shadow-lg glass-shimmer glass-accelerated">
          <div style={{ aspectRatio: "4/3" }} className="bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="p-4 h-[140px] bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150 border-t border-white/20 dark:border-white/10">
            <div className="h-6 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg" />
            <div className="mt-3 h-4 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg" />
            <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg" />
            <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-600 animate-pulse rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="relative rounded-[20px] overflow-hidden shadow-lg glass-fade-in glass-accelerated">
          {/* Placeholder for loaded state - image would be passed as prop */}
          <div
            className="w-full bg-gray-100 dark:bg-gray-800"
            style={{ aspectRatio: "4/3" }}
            role="img"
            aria-label="Product image placeholder"
          />
          <div className="p-4 h-[140px] bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl backdrop-saturate-150 border-t border-white/20 dark:border-white/10">
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
