import { Suspense } from 'react';
import { getProducts } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { HomeClient } from '@/app/HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';

// Route segment config for caching
export const revalidate = 60; // Revalidate every 60 seconds

// Valid category paths that map to post_type values
const CATEGORY_PATHS = ['food', 'thing', 'borrow', 'wanted', 'fridge', 'foodbank', 'business', 'volunteer', 'challenge', 'zerowaste', 'vegan', 'community'];

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

/**
 * Food/Products Listings Page - Server Component
 * Handles all category routes via URL rewrites
 */
export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Get product type from searchParams, default to 'food'
  const productType = params.type && CATEGORY_PATHS.includes(params.type)
    ? params.type
    : 'food';

  // Fetch data in parallel on the server
  const [products, user] = await Promise.all([
    getProducts(productType),
    getUser(),
  ]);

  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <HomeClient
        initialProducts={products}
        user={user}
        productType={productType}
      />
    </Suspense>
  );
}

/**
 * Skeleton loader for the products page
 */
function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />

      {/* Product grid skeleton */}
      <div className="grid gap-10 px-7 py-7 xl:px-20 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(10)].map((_, i) => (
          <SkeletonCard key={i} isLoaded={false} />
        ))}
      </div>
    </div>
  );
}
