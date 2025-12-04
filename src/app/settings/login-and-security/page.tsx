import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser, checkIsAdmin } from '@/app/actions/auth';
import { LoginSecurityClient } from './LoginSecurityClient';

/**
 * Login & Security Settings Page - Server Component
 * Manage password, MFA, and account security
 * Requires authentication
 */
export default async function LoginAndSecurityPage() {
  const [user, isAdmin] = await Promise.all([getUser(), checkIsAdmin()]);

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?from=/settings/login-and-security');
  }

  return (
    <Suspense fallback={<LoginSecuritySkeleton />}>
      <LoginSecurityClient user={user} isAdmin={isAdmin} />
    </Suspense>
  );
}

/**
 * Skeleton loader for login & security page
 */
function LoginSecuritySkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Title Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
