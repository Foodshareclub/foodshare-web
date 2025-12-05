import SkeletonCard from '@/components/productCard/SkeletonCard'

/**
 * Products Loading Component
 * Matches ProductsPageSkeleton from page.tsx
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />

      {/* Product grid skeleton */}
      <div className="grid gap-10 px-7 py-7 xl:px-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(10)].map((_, i) => (
          <SkeletonCard key={i} isLoaded={false} />
        ))}
      </div>
    </div>
  )
}
