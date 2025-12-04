/**
 * Root Loading Component
 * Displays a skeleton loader while pages load
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded-lg w-64 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-96"></div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(8)
            .fill(null)
            .map((_, index) => (
              <div key={index} className="col-span-1 animate-pulse">
                <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100">
                  {/* Image Skeleton */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300" />

                  {/* Content Skeleton */}
                  <div className="p-4 space-y-3">
                    <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          <span className="text-sm font-medium text-gray-700">Loading...</span>
        </div>
      </div>
    </div>
  )
}
