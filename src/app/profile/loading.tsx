'use client'

import { GlassCard } from '@/components/Glass'

/**
 * Profile Loading Component
 * Displays skeleton loader for user profile pages
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Profile Header Skeleton */}
          <GlassCard variant="prominent" borderRadius="20px" className="mb-8 p-8">
            <div className="animate-pulse">
              <div className="flex items-start gap-6 mb-6">
                {/* Avatar Skeleton */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 shrink-0"></div>

                <div className="flex-1 space-y-4">
                  {/* Name Skeleton */}
                  <div className="h-8 bg-gray-200 rounded-lg w-64"></div>

                  {/* Stats Row */}
                  <div className="flex gap-6">
                    <div className="space-y-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Action Button Skeleton */}
                <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
              </div>

              {/* Bio Skeleton */}
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </GlassCard>

          {/* Tabs Skeleton */}
          <div className="flex gap-4 mb-6">
            {Array(3)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              ))}
          </div>

          {/* Content Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6)
              .fill(null)
              .map((_, index) => (
                <div key={index} className="col-span-1 animate-pulse">
                  <GlassCard
                    variant="standard"
                    borderRadius="20px"
                    padding="0"
                    overflow="hidden"
                  >
                    {/* Image Skeleton */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-4 space-y-3">
                      <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </GlassCard>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-lg px-6 py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
          <span className="text-sm font-medium text-gray-700">Loading profile...</span>
        </div>
      </div>
    </div>
  )
}
