import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HomeClient } from "./HomeClient";
import { getProducts } from "@/lib/data/products";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import {
  generateOrganizationJsonLd,
  generateWebsiteJsonLd,
  generateSoftwareApplicationJsonLd,
  safeJsonLdStringify,
} from "@/lib/jsonld";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

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
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

/**
 * Parse and validate location params from URL
 */
function parseLocationParams(params: {
  lat?: string;
  lng?: string;
  radius?: string;
}): { lat: number; lng: number; radius: number } | null {
  const lat = params.lat ? parseFloat(params.lat) : null;
  const lng = params.lng ? parseFloat(params.lng) : null;
  const radius = params.radius ? parseInt(params.radius, 10) : 5000;

  if (
    lat === null ||
    lng === null ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const clampedRadius = Math.max(100, Math.min(100000, radius));
  return { lat, lng, radius: clampedRadius };
}

/**
 * Home Page - Server Component
 * Supports location-based filtering via URL params: ?lat=X&lng=Y&radius=Z
 */
export default async function Home({ searchParams }: PageProps) {
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect("/maintenance");
  }

  const params = await searchParams;
  const locationParams = parseLocationParams(params);
  const isLocationFiltered = locationParams !== null;

  // Generate JSON-LD structured data for SEO
  const organizationJsonLd = generateOrganizationJsonLd();
  const websiteJsonLd = generateWebsiteJsonLd();
  const softwareAppJsonLd = generateSoftwareApplicationJsonLd();

  // If location params provided, fetch nearby posts using PostGIS
  if (isLocationFiltered) {
    let nearbyPosts: Awaited<ReturnType<typeof getNearbyPosts>>["data"] = [];
    try {
      const result = await getNearbyPosts({
        lat: locationParams.lat,
        lng: locationParams.lng,
        radiusMeters: locationParams.radius,
        postType: "food",
        limit: 100,
      });
      nearbyPosts = result.data;
    } catch {
      redirect("/maintenance");
    }

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
          <HomeClient
            initialProducts={[]}
            productType="food"
            nearbyPosts={nearbyPosts}
            isLocationFiltered={true}
            radiusMeters={locationParams.radius}
          />
        </Suspense>
      </>
    );
  }

  // No location filter - fetch all food products
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = await getProducts("food");
  } catch {
    redirect("/maintenance");
  }

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
