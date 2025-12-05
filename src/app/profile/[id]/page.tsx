import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '@/app/actions/profile';
import { getUser } from '@/app/actions/auth';
import { ViewProfileClient } from './ViewProfileClient';
import { GlassCard } from '@/components/Glass';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * View Profile Page - Server Component
 * Displays another user's public profile
 */
export default async function ViewProfilePage({ params }: PageProps) {
  const { id } = await params;

  // Fetch data in parallel on the server
  const [profile, user] = await Promise.all([
    getPublicProfile(id),
    getUser(),
  ]);

  if (!profile) {
    notFound();
  }

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ViewProfileClient profile={profile} user={user} />
    </Suspense>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    return { title: 'Profile Not Found | FoodShare' };
  }

  const fullName = [profile.first_name, profile.second_name].filter(Boolean).join(' ') || 'User';

  return {
    title: `${fullName} | FoodShare`,
    description: profile.about_me || `View ${fullName}'s profile on FoodShare`,
    openGraph: {
      title: `${fullName} on FoodShare`,
      description: profile.about_me || `${fullName} is a member of FoodShare community`,
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  };
}

/**
 * Skeleton loader for profile page
 */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 dark:bg-background">
      <div className="container mx-auto max-w-4xl pt-24 pb-12 px-4">
        <GlassCard variant="standard" padding="0" overflow="hidden">
          <div className="h-[200px] bg-muted animate-pulse" />
          <div className="p-8 space-y-4">
            <div className="h-24 w-24 mx-auto rounded-full bg-muted animate-pulse -mt-12" />
            <div className="h-8 bg-muted animate-pulse rounded max-w-xs mx-auto" />
            <div className="h-4 bg-muted animate-pulse rounded max-w-sm mx-auto" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
