import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { SettingsClient } from './SettingsClient';

/**
 * Settings Page - Server Component
 * Main settings hub with navigation cards
 * Requires authentication
 */
export default async function SettingsPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?from=/settings');
  }

  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsClient />
    </Suspense>
  );
}

/**
 * Skeleton loader for settings page
 */
function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-7 xl:px-20 py-8">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Settings Cards Grid Skeleton */}
      <div className="px-7 xl:px-20 py-10 grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
