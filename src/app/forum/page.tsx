import { Suspense } from 'react';
import { getForumPageData } from '@/lib/data/forum';
import { ForumPageClient } from '@/components/forum';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  title: 'Community Forum | FoodShare',
  description: 'Join the FoodShare community forum to share ideas, ask questions, and connect with other food sharers.',
};

// ============================================================================
// Loading Skeleton
// ============================================================================

function ForumSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Skeleton */}
      <div className="bg-primary/90 text-white">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-10 w-64 bg-white/20 mb-2" />
          <Skeleton className="h-6 w-96 bg-white/20" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-32 rounded-2xl" />
              <Skeleton className="h-32 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </aside>

          {/* Main */}
          <main className="flex-1">
            <Skeleton className="h-16 rounded-2xl mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-card">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Component
// ============================================================================

async function ForumContent() {
  const data = await getForumPageData();

  return (
    <ForumPageClient
      posts={data.posts}
      categories={data.categories}
      tags={data.tags}
      stats={data.stats}
      leaderboard={data.leaderboard}
      trendingPosts={data.trendingPosts}
      recentActivity={data.recentActivity}
    />
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumSkeleton />}>
      <ForumContent />
    </Suspense>
  );
}
