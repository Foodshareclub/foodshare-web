import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { ProfileSettingsClient } from './ProfileSettingsClient';
import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
  'Profile',
  'Manage your FoodShare profile settings'
);

// Route segment config for caching
export const revalidate = 300; // Revalidate every 5 minutes

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
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-6xl pt-24 pb-12 px-4">
        {/* Profile Header Card Skeleton */}
        <div className="mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Settings Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-muted animate-pulse rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
