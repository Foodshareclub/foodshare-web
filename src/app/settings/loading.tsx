import { Skeleton } from "@/components/ui/skeleton";

/**
 * Settings Loading Component
 * Matches the modern sidebar + content layout
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-10">
        {/* Header Skeleton */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex gap-8">
          {/* Desktop Sidebar Skeleton */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-6">
              {/* Account section */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 mb-3" />
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
                <Skeleton className="h-4 w-24 mb-3" />
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

              <Skeleton className="h-px w-full" />

              {/* Support section */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 mb-3" />
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
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 space-y-8">
            {/* Welcome section */}
            <div className="rounded-xl border border-border/50 bg-card/50 p-6 lg:p-8">
              <div className="flex items-start gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-5">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-28 mb-2" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coming soon */}
            <div className="space-y-4">
              <Skeleton className="h-6 w-28" />
              <div className="rounded-xl border border-border/50 bg-card/50 p-6">
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-28 rounded-lg" />
                  ))}
                </div>
                <Skeleton className="h-4 w-64 mt-4" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
