/**
 * Settings Loading Component
 * Displays a skeleton loader while settings page loads
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header skeleton */}
          <div className="animate-pulse mb-8">
            <div className="h-8 bg-gray-200 rounded-lg w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-64" />
          </div>

          {/* Settings sections */}
          <div className="space-y-6">
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-48" />
                    </div>
                    <div className="h-6 w-12 bg-gray-200 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-28" />
                      <div className="h-3 bg-gray-200 rounded w-40" />
                    </div>
                    <div className="h-6 w-12 bg-gray-200 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save button skeleton */}
          <div className="mt-8 animate-pulse">
            <div className="h-12 bg-gray-200 rounded-lg w-full" />
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
          <span className="text-sm font-medium text-gray-700">Loading settings...</span>
        </div>
      </div>
    </div>
  );
}
