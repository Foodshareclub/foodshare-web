import { Suspense } from "react";
import { ChallengesClient } from "./ChallengesClient";
import { getChallenges, getChallengeStats } from "@/lib/data/challenges";
import { getChallengeLeaderboard, getCurrentUserRank } from "@/lib/data/challenge-leaderboard";
import { getUser } from "@/app/actions/auth";
import { ChallengeContentSkeleton } from "@/components/skeletons/ChallengeSkeleton";
import { generatePageMetadata, siteConfig } from "@/lib/metadata";
import {
  generateBreadcrumbJsonLd,
  generateItemListJsonLd,
  safeJsonLdStringify,
} from "@/lib/jsonld";

export const metadata = generatePageMetadata({
  title: "Community Challenges",
  description:
    "Join challenges to reduce waste, live healthier, and make the world a better place.",
  keywords: ["challenges", "sustainability", "zero waste", "community goals"],
  path: "/challenge",
});

/**
 * Async Server Component - fetches all challenge data and streams
 * inside a Suspense boundary. Data fetches run in parallel via
 * Promise.all, and the entire section streams to the client once
 * all promises resolve.
 */
async function ChallengeContent() {
  const [challenges, user, stats, leaderboard, userRank] = await Promise.all([
    getChallenges(),
    getUser(),
    getChallengeStats(),
    getChallengeLeaderboard(),
    getCurrentUserRank(),
  ]);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: siteConfig.url },
    { name: "Challenges", url: siteConfig.url + "/challenge" },
  ]);

  const itemListJsonLd = generateItemListJsonLd({
    name: "FoodShare Community Challenges",
    description:
      "Join challenges to reduce waste, live healthier, and make the world a better place.",
    items: challenges.slice(0, 10).map((challenge, index) => ({
      name: challenge.post_name || "Challenge",
      url: siteConfig.url + "/challenge/" + challenge.id,
      image: challenge.images?.[0] || undefined,
      position: index + 1,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(itemListJsonLd) }}
      />
      <ChallengesClient
        challenges={challenges}
        user={user}
        stats={stats}
        leaderboard={leaderboard}
        currentUserRank={userRank}
      />
    </>
  );
}

/**
 * Challenge Page - renders the skeleton immediately while
 * ChallengeContent streams in with all data.
 */
export default function ChallengePage() {
  return (
    <Suspense fallback={<ChallengeContentSkeleton />}>
      <ChallengeContent />
    </Suspense>
  );
}
