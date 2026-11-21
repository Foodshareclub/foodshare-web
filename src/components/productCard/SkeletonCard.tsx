import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LISTING_PHOTO } from "./listing-layout";
/** Matches the final card: same media ratio, a title bar and one meta bar. */
function SkeletonCard({ isLoaded }: { isLoaded: boolean }) {
  const motion = isLoaded ? "animate-none" : "motion-reduce:animate-none";
  return (
    <Card variant="listing" className="flex h-full min-w-0 flex-col gap-0" aria-hidden="true">
      <Skeleton className={cn(LISTING_PHOTO, "rounded-2xl", motion)} />
      <div className="flex flex-col gap-1.5 pt-3">
        <Skeleton className={cn("h-4 w-4/5", motion)} />
        <Skeleton className={cn("h-3.5 w-3/5", motion)} />
      </div>
    </Card>
  );
}
export default SkeletonCard;
