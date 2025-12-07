import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/data/products';
import { getChallenges } from '@/lib/data/challenges';
import { HomeClient } from '@/app/HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';
import { categoryMetadata, generatePageMetadata } from '@/lib/metadata';

// Route segment config for caching
export const revalidate = 60;

const CATEGORY_PATHS = [
  'food',
  'thing',
  'borrow',
  'wanted',
  'fridge',
  'foodbank',
  'business',
  'volunteer',
  'challenge',
  'zerowaste',
  'vegan',
  'forum',
];

// Map URL params to categoryMetadata keys
const categoryKeyMap: Record<string, keyof typeof categoryMetadata> = {
  food: 'food',
  thing: 'things',
  things: 'things',
  borrow: 'borrow',
  wanted: 'wanted',
  fridge: 'fridges',
  fridges: 'fridges',
  foodbank: 'foodbanks',
  foodbanks: 'foodbanks',
  business: 'business',
  volunteer: 'volunteer',
};

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type || 'food';
  const categoryKey = categoryKeyMap[type] || 'food';
  const category = categoryMetadata[categoryKey];

  return generatePageMetadata({
    title: category.title,
    description: category.description,
    keywords: category.keywords,
    path: type === 'food' ? '/food' : `/food?type=${type}`,
  });
}

/**
 * Check if database is healthy before making auth calls
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
 * Food/Products Listings Page - Server Component
 * Gracefully handles DB unavailability
 */
export default async function ProductsPage({ searchParams }: PageProps) {
  // First check if DB is healthy
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect('/maintenance');
  }

  try {
    const params = await searchParams;
    const productType =
      params.type && CATEGORY_PATHS.includes(params.type) ? params.type : 'food';

    // Fetch products
    let products;
    try {
      products =
        productType === 'challenge' ? await getChallenges() : await getProducts(productType);
    } catch {
      redirect('/maintenance');
    }

    return (
      <Suspense fallback={<ProductsPageSkeleton />}>
        <HomeClient initialProducts={products} productType={productType} />
      </Suspense>
    );
  } catch {
    redirect('/maintenance');
  }
}

function ProductsPageSkeleton() {
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
