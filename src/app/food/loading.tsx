'use client'

import { GlassCard } from '@/components/Glass'

/**
 * Products Loading Component
 * Displays skeleton loader matching the products page design
 */
export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header Skeleton */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-4">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded-lg w-80 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-96"></div>
            </div>
            <div className="h-12 w-48 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
          </div>

          {/* Category Tabs Skeleton */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array(8)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  className="h-10 w-32 bg-gray-200 rounded-full animate-pulse"
                ></div>
              ))}
          </div>
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(12)
            .fill(null)
            .map((_, index) => (
              <div key={index} className="col-span-1 animate-pulse">
                <GlassCard
                  variant="standard"
                  borderRadius="20px"
                  padding="0"
                  overflow="hidden"
                  className="glass-fade-in"
                >
                  {/* Image Skeleton */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 relative overflow-hidden">
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                  </div>

                  {/* Content Skeleton */}
                  <div className="p-4 space-y-3">
                    {/* Title */}
                    <div className="h-6 bg-gray-200 rounded-lg w-4/5"></div>

                    {/* Address */}
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>

                    {/* Available hours */}
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>

                    {/* Transportation */}
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-6 bg-gray-200 rounded"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            ))}
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3 border border-orange-200">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          <span className="text-sm font-medium text-gray-700">Loading products...</span>
        </div>
      </div>
    </div>
  )
}
