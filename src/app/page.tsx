import { Suspense } from 'react';
import { getProducts } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { HomeClient } from './HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';

// Route segment config for caching
export const revalidate = 60; // Revalidate every 60 seconds

/**
 * Home Page - Server Component
 * Fetches initial data on the server and passes to client components
 */
export default async function Home() {
  // Fetch data in parallel on the server
  const [products, user] = await Promise.all([
    getProducts('food'),
    getUser(),
  ]);

  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeClient
        initialProducts={products}
        user={user}
        productType="food"
      />
    </Suspense>
  );
}

/**
 * Skeleton loader for the home page
 */
function HomePageSkeleton() {
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
