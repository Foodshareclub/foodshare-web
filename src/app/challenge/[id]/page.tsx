import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getChallengeById } from '@/lib/data/challenges';
import { getUser } from '@/app/actions/auth';
import { hasAcceptedChallenge } from '@/app/actions/challenges';
import { ChallengeDetailClient } from './ChallengeDetailClient';
import { Skeleton } from '@/components/ui/skeleton';

export const revalidate = 120;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const challengeId = parseInt(id, 10);

  if (isNaN(challengeId)) {
    notFound();
  }

  // Fetch all data in parallel to avoid waterfall
  const [challenge, user, isAccepted] = await Promise.all([
    getChallengeById(challengeId),
    getUser(),
    hasAcceptedChallenge(challengeId), // Returns false if not authenticated
  ]);

  if (!challenge) {
    notFound();
  }

  return (
    <Suspense fallback={<ChallengeDetailSkeleton />}>
      <ChallengeDetailClient challenge={challenge} user={user} isAccepted={isAccepted} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const challengeId = parseInt(id, 10);

  if (isNaN(challengeId)) {
    return { title: 'Challenge Not Found' };
  }

  const challenge = await getChallengeById(challengeId);

  if (!challenge) {
    return { title: 'Challenge Not Found' };
  }

  return {
    title: `${challenge.challenge_title} | FoodShare Challenges`,
    description: challenge.challenge_description,
    openGraph: {
      title: challenge.challenge_title,
      description: challenge.challenge_description,
      images: challenge.challenge_image ? [challenge.challenge_image] : [],
    },
  };
}

function ChallengeDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-80 bg-muted animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-48" />
      </div>
    </div>
  );
}
