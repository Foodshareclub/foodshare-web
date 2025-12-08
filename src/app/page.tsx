import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getProducts } from '@/lib/data/products';
import { HomeClient } from './HomeClient';
import SkeletonCard from '@/components/productCard/SkeletonCard';
import { generateOrganizationJsonLd, generateWebsiteJsonLd, generateSoftwareApplicationJsonLd, safeJsonLdStringify } from '@/lib/jsonld';

export const revalidate = 60;

/**
 * Check if database is healthy before making any calls
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
 * Home Page - Server Component
 * Checks DB health first, then fetches data
 */
export default async function Home() {
  // First check if DB is healthy
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect('/maintenance');
  }

  try {
    // Fetch products
    let products;
    try {
      products = await getProducts('food');
    } catch {
      redirect('/maintenance');
    }

    // Generate JSON-LD structured data for SEO
    const organizationJsonLd = generateOrganizationJsonLd();
    const websiteJsonLd = generateWebsiteJsonLd();
    const softwareAppJsonLd = generateSoftwareApplicationJsonLd();

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(softwareAppJsonLd) }}
        />
        <Suspense fallback={<HomePageSkeleton />}>
          <HomeClient initialProducts={products} productType="food" />
        </Suspense>
      </>
    );
  } catch {
    redirect('/maintenance');
  }
}

function HomePageSkeleton() {
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
