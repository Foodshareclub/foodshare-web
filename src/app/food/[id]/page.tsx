import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/data/products';
import { getUser } from '@/app/actions/auth';
import { ProductDetailClient } from './ProductDetailClient';
import { GlassCard } from '@/components/Glass';

// Route segment config for caching
export const revalidate = 120; // Revalidate every 2 minutes

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Product Detail Page - Server Component
 * Fetches product data on the server and passes to client component
 */
export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    notFound();
  }

  // Fetch data in parallel on the server
  const [product, user] = await Promise.all([
    getProductById(productId),
    getUser(),
  ]);

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailClient product={product} user={user} />
    </Suspense>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const productId = parseInt(id, 10);

  if (isNaN(productId)) {
    return { title: 'Product Not Found' };
  }

  const product = await getProductById(productId);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  return {
    title: `${product.post_name} | FoodShare`,
    description: product.post_description || `${product.post_type} available at ${product.post_stripped_address}`,
    openGraph: {
      title: product.post_name,
      description: product.post_description || `${product.post_type} available`,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
  };
}

/**
 * Skeleton loader for product detail page
 */
function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-white border-b animate-pulse" />

      {/* Main content skeleton */}
      <div className="flex flex-col lg:flex-row">
        {/* Left Column - Product Detail Skeleton */}
        <div className="w-full lg:w-1/2 px-4 pb-12">
          <div className="animate-pulse">
            <GlassCard variant="standard" padding="0" className="w-full overflow-hidden">
              {/* Image with back button skeleton */}
              <div className="relative aspect-[16/9] bg-gray-200">
                <div className="absolute top-4 left-4 h-9 w-20 bg-white/90 rounded-lg" />
              </div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-20 mb-3" />
                <div className="h-8 bg-gray-200 rounded mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
                <hr className="my-4 border-gray-200" />
                <div className="flex justify-between mb-4">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-20" />
                </div>
                <hr className="my-4 border-gray-200" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="mt-6 h-12 bg-gray-200 rounded" />
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Right Column - Map Skeleton */}
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-4xl">🗺️</span>
        </div>
      </div>
    </div>
  );
}
