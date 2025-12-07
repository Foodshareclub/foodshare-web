import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser, checkIsAdmin } from '@/app/actions/auth';
import { LoginSecurityClient } from './LoginSecurityClient';
import { generateNoIndexMetadata } from '@/lib/metadata';

export const metadata = generateNoIndexMetadata(
  'Login & Security',
  'Manage your password and security settings'
);

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
    <div className="bg-muted/30 dark:bg-background pb-10">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </div>

        {/* Title Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-muted rounded animate-pulse" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-32 bg-muted rounded-xl animate-pulse" />
          <div className="h-48 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
