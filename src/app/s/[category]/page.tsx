import { Suspense } from 'react';
import { searchProducts, getProducts } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { HomeClient } from '@/app/HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';

// Valid category paths that map to post_type values
const CATEGORY_PATHS = ['all', 'food', 'thing', 'borrow', 'wanted', 'fridge', 'foodbank', 'business', 'volunteer', 'challenge', 'zerowaste', 'vegan', 'community'];

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

  // Normalize category
  const productType = CATEGORY_PATHS.includes(category) ? category : 'all';

  // Fetch data in parallel
  const [products, user] = await Promise.all([
    key_word
      ? searchProducts(key_word, productType)
      : productType === 'all'
        ? getProducts('food')
        : getProducts(productType),
    getUser(),
  ]);

  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <HomeClient
        initialProducts={products}
        user={user}
        productType={productType === 'all' ? 'food' : productType}
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
