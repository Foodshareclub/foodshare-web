import { Skeleton } from "@/components/ui/skeleton";

/**
 * Settings Loading Component
 * Matches the bento-grid layout with user profile header
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header Skeleton */}
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl" />
            <div>
              <Skeleton className="h-6 lg:h-7 w-24 mb-1" />
              <Skeleton className="h-3 lg:h-4 w-40 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-6 lg:gap-8">
          {/* Desktop Sidebar Skeleton */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-6">
              {/* Account section */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 mb-3" />
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>

              <Skeleton className="h-px w-full" />

              {/* Preferences section */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 mb-3" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 opacity-50">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* User Profile Header */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Skeleton className="w-20 h-20 rounded-2xl" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="w-[104px] h-9 rounded-lg" />
              </div>
            </div>

            {/* Bento Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Large card */}
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
                  <Skeleton className="w-14 h-14 rounded-xl mb-4" />
                  <Skeleton className="h-5 w-40 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>

              {/* Profile completion */}
              <div className="rounded-xl border border-border/50 bg-card/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full mb-4 rounded-full" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Small cards */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5">
                  <Skeleton className="w-12 h-12 rounded-xl mb-3" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/50 p-5">
                <Skeleton className="h-4 w-28 mb-3" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
