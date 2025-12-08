import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getUser } from '@/app/actions/auth';
import { getUserProducts } from '@/lib/data/products';
import { MyPostsClient } from './MyPostsClient';
import { MyPostsSkeleton } from './MyPostsSkeleton';

export const metadata = {
  title: 'My Posts | FoodShare',
  description: 'Manage your food sharing posts - create, edit, and delete your listings',
};

// Route segment config for caching
export const revalidate = 60;

/**
 * My Posts Page - Server Component
 * Full post management system for authenticated users
 */
export default async function MyPostsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/login?from=/my-posts');
  }

  const posts = await getUserProducts(user.id);

  return (
    <Suspense fallback={<MyPostsSkeleton />}>
      <MyPostsClient posts={posts} />
    </Suspense>
  );
}
