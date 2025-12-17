import { Suspense } from "react";
import { ChallengesClient } from "./ChallengesClient";
import { getChallenges, getChallengeStats } from "@/lib/data/challenges";
import { getChallengeLeaderboard, getCurrentUserRank } from "@/lib/data/challenge-leaderboard";
import { getUser } from "@/app/actions/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { generatePageMetadata } from "@/lib/metadata";

export const revalidate = 60;

export const metadata = generatePageMetadata({
  title: "Community Challenges",
  description:
    "Join challenges to reduce waste, live healthier, and make the world a better place.",
  keywords: ["challenges", "sustainability", "zero waste", "community goals"],
  path: "/challenge",
});

export default async function ChallengePage() {
  const [challenges, user, stats, leaderboard, userRank] = await Promise.all([
    getChallenges(),
    getUser(),
    getChallengeStats(),
    getChallengeLeaderboard(),
    getCurrentUserRank(),
  ]);

  return (
    <Suspense fallback={<ChallengeSkeleton />}>
      <ChallengesClient
        challenges={challenges}
        user={user}
        stats={stats}
        leaderboard={leaderboard}
        currentUserRank={userRank}
      />
    </Suspense>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-primary/5 to-teal-500/5 flex flex-col items-center justify-center">
      {/* Badge skeleton */}
      <Skeleton className="h-10 w-48 rounded-full mb-8" />
      {/* Title skeleton */}
      <Skeleton className="h-16 w-80 rounded-lg mb-4" />
      <Skeleton className="h-6 w-96 rounded-lg mb-8" />
      {/* Deck skeleton */}
      <div className="relative mb-12">
        <Skeleton className="w-64 sm:w-72 rounded-2xl" style={{ aspectRatio: "3/4" }} />
        <div className="absolute top-2 left-1 -z-10">
          <Skeleton
            className="w-64 sm:w-72 rounded-2xl opacity-70"
            style={{ aspectRatio: "3/4" }}
          />
        </div>
        <div className="absolute top-4 left-2 -z-20">
          <Skeleton
            className="w-64 sm:w-72 rounded-2xl opacity-40"
            style={{ aspectRatio: "3/4" }}
          />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-16 w-32 rounded-xl" />
        <Skeleton className="h-16 w-32 rounded-xl" />
        <Skeleton className="h-16 w-32 rounded-xl" />
      </div>
    </div>
  );
}
