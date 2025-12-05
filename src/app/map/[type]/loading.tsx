/**
 * Map Loading Component
 * Matches MapPageSkeleton from page.tsx
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />

      {/* Map skeleton */}
      <div className="relative h-map w-full">
        <div className="h-full w-full animate-pulse bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
