import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { ProfileSettingsClient } from './ProfileSettingsClient';
import { GlassCard } from '@/components/Glass';

/**
 * Profile Settings Page - Server Component
 * Shows user profile card and settings options
 * Requires authentication
 */
export default async function ProfilePage() {
  const user = await getUser();

  // Redirect if not authenticated
  if (!user) {
    redirect('/auth/login?from=/profile');
  }

  return (
    <Suspense fallback={<ProfileSettingsSkeleton />}>
      <ProfileSettingsClient user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for profile settings page
 */
function ProfileSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-6xl pt-24 pb-12 px-4">
        {/* Profile Header Card Skeleton */}
        <div className="mb-8">
          <GlassCard variant="standard" className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Settings Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(2)].map((_, i) => (
            <GlassCard key={i} variant="standard" className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
