import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { PersonalInfoClient } from './PersonalInfoClient';
import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
  'Personal Info',
  'Update your personal information'
);

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
    <div className="bg-muted/30 dark:bg-background pb-10">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        </div>

        {/* Title Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-muted rounded animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-card rounded-xl shadow-sm border border-border p-6"
            >
              <div className="h-6 w-24 bg-muted rounded animate-pulse mb-4" />
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
