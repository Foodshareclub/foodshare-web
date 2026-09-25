import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LISTING_PHOTO } from "./listing-layout";

function SkeletonCard({ isLoaded }: { isLoaded: boolean }) {
  const motion = isLoaded ? "animate-none" : "motion-reduce:animate-none";

  return (
    <Card variant="listing" className="flex h-full min-w-0 flex-col" aria-hidden="true">
      <Skeleton className={cn(LISTING_PHOTO, "rounded-2xl", motion)} />
      <CardHeader className="gap-2">
        <Skeleton className={cn("h-5 w-4/5", motion)} />
        <Skeleton className={cn("h-5 w-3/5", motion)} />
        <Skeleton className={cn("mt-1 h-4 w-2/3", motion)} />
      </CardHeader>
      <CardContent className="mt-auto">
        <Skeleton className={cn("h-4 w-1/2", motion)} />
      </CardContent>
    </Card>
  );
}

export default SkeletonCard;
