import { Suspense } from 'react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ForumPostCard } from '@/components/forum';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { ForumPost } from '@/api/forumAPI';
import { FaPlus } from 'react-icons/fa';

export const metadata = {
  title: 'Community Forum',
  description: 'Join the FoodShare community discussion',
};

async function getForumPosts(): Promise<ForumPost[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('forum')
    .select(`
      *,
      profiles:profile_id (id, nickname, first_name, second_name, avatar_url),
      forum_categories:category_id (*),
      forum_post_tags (forum_tags (*))
    `)
    .eq('forum_published', true)
    .order('is_pinned', { ascending: false })
    .order('last_activity_at', { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as ForumPost[];
}

function ForumSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between pt-4">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function ForumPostsList() {
  const posts = await getForumPosts();

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts yet. Be the first to start a discussion!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post, index) => (
        <ForumPostCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
}

export default async function ForumPage() {
  const t = await getTranslations();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('forum_title')}</h1>
          <p className="text-muted-foreground">{t('forum_description')}</p>
        </div>
        <Button asChild>
          <Link href="/forum/new">
            <FaPlus className="mr-2 h-4 w-4" />
            {t('new_post')}
          </Link>
        </Button>
      </div>

      <Suspense fallback={<ForumSkeleton />}>
        <ForumPostsList />
      </Suspense>
    </div>
  );
}
