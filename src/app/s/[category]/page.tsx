import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { searchProducts, getProducts } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { HomeClient } from '@/app/HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';
import { categoryMetadata, generatePageMetadata } from '@/lib/metadata';

// Valid category URL paths (plural form for consistency)
const CATEGORY_PATHS = ['all', 'food', 'things', 'borrow', 'wanted', 'fridges', 'foodbanks', 'organisations', 'volunteers', 'challenges', 'zerowaste', 'vegan', 'forum'];

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
  'forum': 'forum',
};

// Map URL paths to categoryMetadata keys
const categoryKeyMap: Record<string, keyof typeof categoryMetadata> = {
  food: 'food',
  things: 'things',
  borrow: 'borrow',
  wanted: 'wanted',
  fridges: 'fridges',
  foodbanks: 'foodbanks',
  volunteers: 'volunteer',
  organisations: 'business',
};

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ key_word?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryKey = categoryKeyMap[category];

  if (categoryKey && categoryMetadata[categoryKey]) {
    const meta = categoryMetadata[categoryKey];
    return generatePageMetadata({
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      path: `/s/${category}`,
    });
  }

  return generatePageMetadata({
    title: 'Browse Listings',
    description: 'Browse and discover food and items shared by your community.',
    path: `/s/${category}`,
  });
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
