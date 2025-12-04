import { GlassCard } from '@/components/Glass'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'

/**
 * 404 Not Found Page
 * Displayed when a user navigates to a non-existent route
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <GlassCard variant="prominent" borderRadius="24px" className="p-8 md:p-12">
          {/* 404 Illustration */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-6">
              {/* Animated 404 */}
              <div className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 animate-pulse">
                404
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 text-4xl animate-bounce">🔍</div>
              <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">
                📍
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Oops! The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-sm text-gray-500">
              It might have been shared, borrowed, or already taken!
            </p>
          </div>

          {/* Helpful Suggestions */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>💡</span>
                <span>Here's what you can do:</span>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Double-check the URL for typos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Use the navigation menu to find what you need</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Browse our product listings below</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>Return to the homepage and start fresh</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link
              href="/"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 text-center focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              🏠 Go to Homepage
            </Link>
            <BackButton className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2" />
          </div>

          {/* Quick Links */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">
              Popular Pages
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link
                href="/food?type=food"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  🍽️
                </div>
                <p className="text-sm font-semibold text-gray-900">Food</p>
                <p className="text-xs text-gray-500">Browse listings</p>
              </Link>

              <Link
                href="/food?type=thing"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <p className="text-sm font-semibold text-gray-900">Things</p>
                <p className="text-xs text-gray-500">Share items</p>
              </Link>

              <Link
                href="/map/food"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  🗺️
                </div>
                <p className="text-sm font-semibold text-gray-900">Map</p>
                <p className="text-xs text-gray-500">Find nearby</p>
              </Link>

              <Link
                href="/food?type=foodbank"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  🏪
                </div>
                <p className="text-sm font-semibold text-gray-900">Food Banks</p>
                <p className="text-xs text-gray-500">Get help</p>
              </Link>

              <Link
                href="/food?type=fridge"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  ❄️
                </div>
                <p className="text-sm font-semibold text-gray-900">Fridges</p>
                <p className="text-xs text-gray-500">Community</p>
              </Link>

              <Link
                href="/food/new"
                className="p-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-md transition-all text-center group"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  ➕
                </div>
                <p className="text-sm font-semibold text-gray-900">Create</p>
                <p className="text-xs text-gray-500">New listing</p>
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Lost? Need help?{' '}
            <a href="mailto:support@foodshare.com" className="text-orange-600 hover:text-orange-700 underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
