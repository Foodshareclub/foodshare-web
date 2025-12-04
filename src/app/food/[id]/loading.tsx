/**
 * Food Detail Loading Component
 * Displays a skeleton loader while product details load
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb skeleton */}
          <div className="animate-pulse mb-6">
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery Skeleton */}
            <div className="space-y-4">
              <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
              <div className="flex gap-2">
                {Array(4).fill(null).map((_, i) => (
                  <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div className="space-y-6 animate-pulse">
              <div>
                <div className="h-8 bg-gray-200 rounded-lg w-3/4 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-1/4" />
              </div>

              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                {Array(4).fill(null).map((_, i) => (
                  <div key={i} className="p-4 bg-gray-100 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-4">
                <div className="h-12 bg-gray-200 rounded-lg flex-1" />
                <div className="h-12 bg-gray-200 rounded-lg w-12" />
              </div>

              {/* Seller info */}
              <div className="p-4 bg-gray-100 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map Section Skeleton */}
          <div className="mt-8">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
            <div className="h-64 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl animate-pulse" />
          </div>

          {/* Reviews Section Skeleton */}
          <div className="mt-8">
            <div className="h-6 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
            <div className="space-y-4">
              {Array(3).fill(null).map((_, i) => (
                <div key={i} className="p-4 bg-white rounded-xl border animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
          <span className="text-sm font-medium text-gray-700">Loading product...</span>
        </div>
      </div>
    </div>
  );
}
