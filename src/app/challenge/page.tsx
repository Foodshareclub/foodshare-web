import { Suspense } from 'react';
import { getChallenges, getPopularChallenges } from '@/lib/data/challenges';
import { getUser } from '@/app/actions/auth';
import { ChallengesClient } from './ChallengesClient';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 60;

export const metadata = generatePageMetadata({
  title: 'Community Challenges',
  description: 'Join challenges to reduce waste, live healthier, and make the world a better place.',
  keywords: ['challenges', 'sustainability', 'zero waste', 'community goals'],
  path: '/challenge',
});

export default async function ChallengePage() {
  const [challenges, popularChallenges, user] = await Promise.all([
    getChallenges(),
    getPopularChallenges(3),
    getUser(),
  ]);

  // Calculate community stats
  const totalChallenges = challenges.length;
  const totalParticipants = challenges.reduce(
    (sum, c) => sum + (Number(c.post_like_counter) || 0),
    0
  );

  return (
    <Suspense fallback={<ChallengeSkeleton />}>
      <ChallengesClient
        challenges={challenges}
        popularChallenges={popularChallenges}
        user={user}
        stats={{ totalChallenges, totalParticipants }}
      />
    </Suspense>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-64 bg-gradient-to-br from-primary/20 to-teal-500/20 animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
