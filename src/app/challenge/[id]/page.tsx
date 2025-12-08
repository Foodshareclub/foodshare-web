import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getChallengeById } from '@/lib/data/challenges';
import { getUser } from '@/app/actions/auth';
import { hasAcceptedChallenge } from '@/app/actions/challenges';
import { ChallengeDetailClient } from './ChallengeDetailClient';
import { Skeleton } from '@/components/ui/skeleton';
import { generateEventJsonLd, generateBreadcrumbJsonLd, safeJsonLdStringify } from '@/lib/jsonld';

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

  // Generate JSON-LD structured data
  const eventJsonLd = generateEventJsonLd({
    name: challenge.challenge_title || 'Community Challenge',
    description: challenge.challenge_description || 'Join this challenge on FoodShare',
    image: challenge.challenge_image || undefined,
    url: `https://foodshare.club/challenge/${challengeId}`,
  });

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: 'https://foodshare.club' },
    { name: 'Challenges', url: 'https://foodshare.club/challenge' },
    { name: challenge.challenge_title || 'Challenge', url: `https://foodshare.club/challenge/${challengeId}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <Suspense fallback={<ChallengeDetailSkeleton />}>
        <ChallengeDetailClient challenge={challenge} user={user} isAccepted={isAccepted} />
      </Suspense>
    </>
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

  const title = challenge.challenge_title || 'Community Challenge';
  const description = challenge.challenge_description?.slice(0, 160) || 'Join this challenge on FoodShare';
  const pageUrl = `https://foodshare.club/challenge/${challengeId}`;
  const imageUrl = challenge.challenge_image || 'https://foodshare.club/og-image.jpg';

  return {
    title: `${title} | FoodShare Challenges`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    // OpenGraph: Facebook, LinkedIn, WhatsApp
    openGraph: {
      type: 'article',
      locale: 'en_US',
      url: pageUrl,
      siteName: 'FoodShare',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} - FoodShare Challenge`,
          type: 'image/jpeg',
        },
      ],
      section: 'Challenges',
    },
    // Twitter / X Cards
    twitter: {
      card: 'summary_large_image',
      site: '@foodshareapp',
      creator: '@foodshareapp',
      title: `${title} | FoodShare`,
      description,
      images: [
        {
          url: imageUrl,
          alt: `${title} - FoodShare Challenge`,
        },
      ],
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
