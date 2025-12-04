import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { PersonalInfoClient } from './PersonalInfoClient';

/**
 * Personal Info Settings Page - Server Component
 * Manage user profile information
 * Requires authentication
 */
export default async function PersonalInfoPage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?from=/settings/personal-info');
  }

  return (
    <Suspense fallback={<PersonalInfoSkeleton />}>
      <PersonalInfoClient user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for personal info page
 */
function PersonalInfoSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Title Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
