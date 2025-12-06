import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { searchProducts, getProducts } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { HomeClient } from '@/app/HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';

// Valid category URL paths (plural form for consistency)
const CATEGORY_PATHS = ['all', 'food', 'things', 'borrow', 'wanted', 'fridges', 'foodbanks', 'organisations', 'volunteers', 'challenges', 'zerowaste', 'vegan', 'community'];

// Map URL paths to database post_type values (singular form)
const URL_TO_POST_TYPE: Record<string, string> = {
  'food': 'food',
  'things': 'thing',
  'borrow': 'borrow',
  'wanted': 'wanted',
  'fridges': 'fridge',
  'foodbanks': 'foodbank',
  'organisations': 'business',
  'volunteers': 'volunteer',
  'challenges': 'challenge',
  'zerowaste': 'zerowaste',
  'vegan': 'vegan',
  'community': 'community',
};

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ key_word?: string }>;
}

/**
 * Search Results Page - Server Component
 * Handles /s/[category]?key_word=... routes
 */
export default async function SearchPage({ params, searchParams }: PageProps) {
  const [{ category }, { key_word }] = await Promise.all([params, searchParams]);

  // Validate URL category path
  const urlCategory = CATEGORY_PATHS.includes(category) ? category : 'all';
  
  // Challenges have a dedicated table and page - redirect there
  if (urlCategory === 'challenges') {
    redirect('/challenge');
  }
  
  // Map URL path to database post_type
  const dbPostType = urlCategory === 'all' ? 'food' : (URL_TO_POST_TYPE[urlCategory] || 'food');

  // Fetch data in parallel
  const [products, user] = await Promise.all([
    key_word
      ? searchProducts(key_word, dbPostType)
      : getProducts(dbPostType),
    getUser(),
  ]);

  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <HomeClient
        initialProducts={products}
        user={user}
        productType={urlCategory === 'all' ? 'food' : urlCategory}
      />
    </Suspense>
  );
}

function SearchPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />
      <div className="grid gap-10 px-7 py-7 xl:px-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(10)].map((_, i) => (
          <SkeletonCard key={i} isLoaded={false} />
        ))}
      </div>
    </div>
  );
}
