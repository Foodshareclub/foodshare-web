import { Skeleton } from "@/components/ui/skeleton";

export default function DonationLoading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      <div className="relative overflow-hidden pb-16">
        <div className="container mx-auto max-w-7xl px-4 relative z-10">
        {/* Hero Section Skeleton */}
        <div className="flex flex-col gap-12 text-center mb-24 pt-12">
          <div className="flex flex-col gap-6 items-center">
            <Skeleton className="h-8 w-48 rounded-full" />
            <Skeleton className="h-16 w-full max-w-2xl" />
            <Skeleton className="h-8 w-full max-w-xl" />
          </div>

          {/* CTA Card Skeleton */}
          <div className="w-full max-w-5xl mx-auto">
            <Skeleton className="h-[400px] rounded-[3rem]" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[280px] rounded-[3rem]" />
          ))}
        </div>

        {/* Mission Statement Skeleton */}
        <Skeleton className="h-[300px] rounded-[4rem] mb-24" />

        {/* Final CTA Skeleton */}
        <div className="flex flex-col gap-10 items-center mb-16 pb-12">
          <Skeleton className="h-12 w-full max-w-lg" />
          <Skeleton className="h-8 w-full max-w-md" />
          <div className="flex gap-6">
            <Skeleton className="h-16 w-48 rounded-full" />
            <Skeleton className="h-16 w-48 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
