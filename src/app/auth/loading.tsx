/**
 * Auth Loading Component
 * Displays a skeleton loader while auth pages load
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
          {/* Logo placeholder */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full" />
          </div>

          {/* Title */}
          <div className="h-8 bg-gray-200 rounded-lg w-48 mx-auto mb-2" />
          <div className="h-4 bg-gray-200 rounded w-64 mx-auto mb-8" />

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-12 bg-gray-200 rounded-lg w-full" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-12 bg-gray-200 rounded-lg w-full" />
            </div>
          </div>

          {/* Submit button */}
          <div className="h-12 bg-gray-200 rounded-lg w-full mt-6" />

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-8 mx-4" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social buttons */}
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded-lg w-full" />
            <div className="h-12 bg-gray-200 rounded-lg w-full" />
          </div>

          {/* Footer link */}
          <div className="h-4 bg-gray-200 rounded w-48 mx-auto mt-6" />
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500" />
          <span className="text-sm font-medium text-gray-700">Loading...</span>
        </div>
      </div>
    </div>
  );
}
