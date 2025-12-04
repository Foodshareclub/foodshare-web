'use client'

import { GlassCard } from '@/components/Glass'

/**
 * Admin Loading Component
 * Displays skeleton loader for admin pages
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="w-full md:w-[250px] bg-white border-r border-gray-200 hidden md:block fixed h-screen">
        <div className="flex flex-col gap-2 p-4">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-16 bg-green-100 rounded animate-pulse"></div>
          </div>

          {/* Nav Items Skeleton */}
          {Array(8)
            .fill(null)
            .map((_, index) => (
              <div
                key={index}
                className="h-12 bg-gray-100 rounded-md animate-pulse"
                style={{ animationDelay: `${index * 0.1}s` }}
              ></div>
            ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-0 md:ml-[250px]">
        {/* Mobile Header Skeleton */}
        <div className="block md:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-16 bg-green-100 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Page Content Skeleton */}
        <div className="p-4 md:p-6">
          {/* Page Header */}
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-64 mb-3"></div>
            <div className="h-5 bg-gray-200 rounded w-96"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array(4)
              .fill(null)
              .map((_, index) => (
                <div key={index} className="animate-pulse">
                  <GlassCard variant="standard" borderRadius="12px" className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded"></div>
                    </div>
                  </GlassCard>
                </div>
              ))}
          </div>

          {/* Action Buttons Skeleton */}
          <div className="flex gap-3 mb-6">
            <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          {/* Data Table Skeleton */}
          <GlassCard variant="standard" borderRadius="16px" className="overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {Array(10)
                .fill(null)
                .map((_, index) => (
                  <div key={index} className="px-6 py-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-9 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-9 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="flex items-center gap-3 bg-white rounded-full shadow-xl px-6 py-3 border border-green-200">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
          <span className="text-sm font-medium text-gray-700">Loading admin panel...</span>
        </div>
      </div>
    </div>
  )
}
