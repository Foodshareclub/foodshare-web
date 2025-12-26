import { Skeleton } from "@/components/ui/skeleton";

export default function ForumPostLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back button skeleton */}
      <Skeleton className="h-10 w-32 mb-6" />

      {/* Post Header */}
      <article className="mb-8">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Title */}
        <Skeleton className="h-10 w-3/4 mb-4" />

        {/* Author & Meta */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        {/* Post Image */}
        <Skeleton className="w-full h-64 rounded-xl mb-6" />

        {/* Post Content */}
        <div className="space-y-3 mb-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </article>

      {/* Comments Section */}
      <section className="pt-8 border-t border-border">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
