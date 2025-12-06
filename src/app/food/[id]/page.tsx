import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getProductById, getPopularProductIds } from '@/lib/data/products';
import { getChallengeById } from '@/lib/data/challenges';
import { ProductDetailClient } from './ProductDetailClient';
import type { InitialProductStateType } from '@/types/product.types';

export const revalidate = 120;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  try {
    const productIds = await getPopularProductIds(50);
    return productIds.map((id) => ({ id: String(id) }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

/**
 * Check if database is healthy
 */
async function isDatabaseHealthy(): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Safely get user - only if DB is healthy
 */
async function safeGetUser() {
  try {
    const { getUser } = await import('@/app/actions/auth');
    return await getUser();
  } catch {
    return null;
  }
}

function transformChallengeToProduct(
  challenge: NonNullable<Awaited<ReturnType<typeof getChallengeById>>>
): InitialProductStateType {
  return {
    id: challenge.id,
    post_name: challenge.challenge_title || '',
    post_description: challenge.challenge_description || '',
    images: challenge.challenge_image ? [challenge.challenge_image] : [],
    post_type: 'challenge',
    post_views: Number(challenge.challenge_views) || 0,
    post_like_counter: Number(challenge.challenge_likes_counter) || 0,
    profile_id: challenge.profile_id,
    created_at: challenge.challenge_created_at,
    is_active: challenge.challenge_published,
    is_arranged: false,
    post_address: '',
    post_stripped_address: challenge.challenge_difficulty || '',
    available_hours: '',
    condition: challenge.challenge_difficulty || '',
    transportation: '',
    location: null as unknown as InitialProductStateType['location'],
    five_star: null,
    four_star: null,
  };
}

/**
 * Product Detail Page - Server Component
 * Gracefully handles DB unavailability
 */
export default async function ProductDetailPage({ params, searchParams }: PageProps) {
  // First check if DB is healthy
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect('/maintenance');
  }

  try {
    const [{ id }, search] = await Promise.all([params, searchParams]);
    const productId = parseInt(id, 10);
    const isChallenge = search.type === 'challenge';

    if (isNaN(productId)) {
      notFound();
    }

    // Fetch product first
    let product;
    try {
      product = isChallenge
        ? await getChallengeById(productId).then((c) =>
            c ? transformChallengeToProduct(c) : null
          )
        : await getProductById(productId);
    } catch {
      redirect('/maintenance');
    }

    if (!product) {
      notFound();
    }

    // Only fetch user if product succeeded
    const user = await safeGetUser();

    return (
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetailClient product={product} user={user} />
      </Suspense>
    );
  } catch {
    redirect('/maintenance');
  }
}

export async function generateMetadata({ params, searchParams }: PageProps) {
  try {
    const [{ id }, search] = await Promise.all([params, searchParams]);
    const productId = parseInt(id, 10);
    const isChallenge = search.type === 'challenge';

    if (isNaN(productId)) {
      return { title: 'Not Found' };
    }

    const product = await (isChallenge
      ? getChallengeById(productId).then((c) => (c ? transformChallengeToProduct(c) : null))
      : getProductById(productId)
    ).catch(() => null);

    if (!product) {
      return { title: 'Not Found' };
    }

    const title = isChallenge
      ? `${product.post_name} Challenge | FoodShare`
      : `${product.post_name} | FoodShare`;

    return {
      title,
      description: product.post_description || `${product.post_type} available`,
      openGraph: {
        title: product.post_name,
        description: product.post_description || `${product.post_type} available`,
        images: product.images?.[0] ? [product.images[0]] : [],
      },
    };
  } catch {
    return { title: 'FoodShare' };
  }
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="h-[140px] bg-white border-b animate-pulse" />
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/2 px-4 pb-12">
          <div className="animate-pulse">
            <div className="glass w-full overflow-hidden rounded-xl">
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
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto lg:fixed lg:right-0 lg:top-0 lg:bottom-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <span className="text-4xl">🗺️</span>
        </div>
      </div>
    </div>
  );
}
