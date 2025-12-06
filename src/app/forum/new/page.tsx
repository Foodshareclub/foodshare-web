import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreatePostForm } from '@/components/forum/CreatePostForm';
import { BackButton } from '@/components/navigation/BackButton';
import type { ForumCategory } from '@/api/forumAPI';

async function getCategories(): Promise<ForumCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('forum_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  return (data ?? []) as ForumCategory[];
}

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export default async function NewForumPostPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirect=/forum/new');
  }

  const categories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <BackButton className="mb-4" label="Back to Forum" />
      
      <h1 className="text-3xl font-bold mb-2">Create New Post</h1>
      <p className="text-muted-foreground mb-8">Share your thoughts with the community</p>

      <CreatePostForm categories={categories} userId={user.id} />
    </div>
  );
}
