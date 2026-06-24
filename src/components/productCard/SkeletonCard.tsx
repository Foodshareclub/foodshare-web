import React from "react";

type PropsSkeletonType = {
  isLoaded: boolean;
};

// React Compiler handles memoization automatically
function SkeletonCard({ isLoaded }: PropsSkeletonType) {
  return (
    <div className="contents">
      {!isLoaded ? (
        <div className="relative col-span-1 row-span-2 grid grid-rows-subgrid gap-0 h-full min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <div style={{ aspectRatio: "20/19" }} className="bg-muted animate-pulse" />
          </div>
          <div className="mt-3 flex flex-col gap-0.5">
            <div className="h-[15px] bg-muted animate-pulse rounded-sm w-3/4 mb-0.5" />
            <div className="h-[15px] bg-muted animate-pulse rounded-sm w-1/2 mb-0.5" />
            <div className="h-[15px] bg-muted animate-pulse rounded-sm w-2/3 mb-0.5" />
            <div className="mt-1 h-[15px] bg-muted animate-pulse rounded-sm w-1/3" />
          </div>
        </div>
      ) : (
        <div className="relative col-span-1 row-span-2 grid grid-rows-subgrid gap-0 h-full min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-muted">
            <div
              style={{ aspectRatio: "20/19" }}
              className="w-full bg-muted"
              role="img"
              aria-label="Product image placeholder"
            />
          </div>
          <div className="mt-3 flex flex-col gap-0.5">
            <div className="h-[15px] w-3/4 mb-0.5" />
            <div className="h-[15px] w-1/2 mb-0.5" />
            <div className="h-[15px] w-2/3 mb-0.5" />
            <div className="mt-1 h-[15px] w-1/3" />
          </div>
        </div>
      )}
    </div>
  );
}

export default SkeletonCard;
