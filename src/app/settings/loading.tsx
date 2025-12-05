/**
 * Settings Loading Component
 * Matches SettingsSkeleton from page.tsx
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Section */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-7 xl:px-20 py-8">
          <div className="h-10 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Settings Cards Grid Skeleton */}
      <div className="px-7 xl:px-20 py-10 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl shadow-sm border border-border p-6"
          >
            <div className="w-14 h-14 rounded-full bg-muted animate-pulse mb-4" />
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
