import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the challenge page content.
 * Displayed while challenge data is streaming in.
 */
export function ChallengeContentSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-teal-500/5 flex flex-col items-center justify-center">
      <Skeleton className="h-10 w-48 rounded-full mb-8" />
      <Skeleton className="h-16 w-80 rounded-lg mb-4" />
      <Skeleton className="h-6 w-96 rounded-lg mb-8" />
      <div className="relative mb-12">
        <Skeleton className="w-64 sm:w-72 rounded-2xl" style={{ aspectRatio: "3/4" }} />
        <div className="absolute top-2 left-1 -z-10">
          <Skeleton
            className="w-64 sm:w-72 rounded-2xl opacity-70"
            style={{ aspectRatio: "3/4" }}
          />
        </div>
        <div className="absolute top-4 left-2 -z-20">
          <Skeleton
            className="w-64 sm:w-72 rounded-2xl opacity-40"
            style={{ aspectRatio: "3/4" }}
          />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-16 w-32 rounded-xl" />
        <Skeleton className="h-16 w-32 rounded-xl" />
        <Skeleton className="h-16 w-32 rounded-xl" />
      </div>
    </div>
  );
}
