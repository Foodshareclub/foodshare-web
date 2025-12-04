'use client'

import { GlassCard } from '@/components/Glass'

/**
 * Map Loading Component
 * Displays skeleton loader for map pages
 */
export default function MapLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="flex flex-col h-screen">
        {/* Header Skeleton */}
        <div className="bg-white border-b px-4 py-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <div className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-48"></div>
              </div>

              <div className="flex gap-3">
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
          {/* Sidebar Skeleton */}
          <div className="w-full lg:w-96 bg-white border-r overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Search Bar Skeleton */}
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>

              {/* Filter Pills Skeleton */}
              <div className="flex gap-2 flex-wrap">
                {Array(4)
                  .fill(null)
                  .map((_, index) => (
                    <div
                      key={index}
                      className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"
                    ></div>
                  ))}
              </div>

              {/* List Items Skeleton */}
              <div className="space-y-3 mt-4">
                {Array(8)
                  .fill(null)
                  .map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <GlassCard
                        variant="standard"
                        borderRadius="12px"
                        padding="0"
                        className="overflow-hidden"
                      >
                        <div className="flex gap-3 p-3">
                          {/* Thumbnail Skeleton */}
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                          </div>

                          {/* Content Skeleton */}
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Map Skeleton */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-white/80 rounded mx-auto"></div>
                  <div className="h-4 w-64 bg-white/60 rounded mx-auto"></div>
                </div>
              </div>
            </div>

            {/* Map Markers Skeleton (decorative) */}
            <div className="absolute inset-0">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-8 h-8 bg-red-400/50 rounded-full animate-pulse"
                  style={{
                    top: `${Math.random() * 80 + 10}%`,
                    left: `${Math.random() * 80 + 10}%`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                >
                  <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ping"></div>
                </div>
              ))}
            </div>

            {/* Map Controls Skeleton */}
            <div className="absolute top-4 right-4 space-y-2">
              <div className="w-10 h-10 bg-white rounded-lg shadow-lg animate-pulse"></div>
              <div className="w-10 h-10 bg-white rounded-lg shadow-lg animate-pulse"></div>
              <div className="w-10 h-10 bg-white rounded-lg shadow-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-xl px-6 py-3 border border-orange-200">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          <span className="text-sm font-medium text-gray-700">Loading map...</span>
        </div>
      </div>
    </div>
  )
}
