/**
 * Map Loading Component
 * Matches MapPageSkeleton from page.tsx
 */
export default function Loading() {
  return (
    <div data-map-page className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Navbar skeleton */}
      <div className="h-[170px] shrink-0 bg-card border-b border-border animate-pulse" />

      {/* Map skeleton */}
      <div className="relative flex-1 min-h-0 w-full">
        <div className="absolute inset-0 animate-pulse bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
