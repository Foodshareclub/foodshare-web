/**
 * Profile Detail Loading Component
 * Displays a skeleton loader while profile details load
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile header skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="w-32 h-32 bg-gray-200 rounded-full" />

              {/* Info */}
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="h-8 bg-gray-200 rounded-lg w-48 mx-auto md:mx-0" />
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto md:mx-0" />
                <div className="h-4 bg-gray-200 rounded w-64 mx-auto md:mx-0" />

                {/* Stats */}
                <div className="flex justify-center md:justify-start gap-6 pt-4">
                  {Array(3).fill(null).map((_, i) => (
                    <div key={i} className="text-center">
                      <div className="h-6 bg-gray-200 rounded w-12 mx-auto mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <div className="h-10 w-24 bg-gray-200 rounded-lg" />
                <div className="h-10 w-10 bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Bio section */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-16 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>

          {/* Products section */}
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(null).map((_, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews section */}
          <div className="mt-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-24 mb-6" />
            <div className="space-y-4">
              {Array(3).fill(null).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full" />
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
          <span className="text-sm font-medium text-gray-700">Loading profile...</span>
        </div>
      </div>
    </div>
  );
}
