import { Skeleton } from "@/components/ui/skeleton";

export default function FeedbackLoading() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      <div className="container mx-auto max-w-[560px] py-8 px-4">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-2 mb-4 items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Form Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
          <div className="flex flex-col gap-4">
            {/* Type */}
            <div>
              <Skeleton className="h-4 w-12 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-4 w-12 mb-1.5" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-4 w-12 mb-1.5" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </div>

            {/* Subject */}
            <div>
              <Skeleton className="h-4 w-16 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* Message */}
            <div>
              <Skeleton className="h-4 w-16 mb-1.5" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>

            {/* Button */}
            <Skeleton className="h-[42px] w-full rounded-lg" />
          </div>
        </div>

        {/* Footer */}
        <Skeleton className="h-4 w-64 mx-auto mt-4" />
      </div>
    </div>
  );
}
