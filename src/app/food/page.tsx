import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getProducts } from "@/lib/data/products";
import { getChallenges } from "@/lib/data/challenges";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { HomeClient } from "@/app/HomeClient";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { categoryMetadata, generatePageMetadata } from "@/lib/metadata";

// Route segment config for caching
export const revalidate = 60;

const CATEGORY_PATHS = [
  "food",
  "thing",
  "borrow",
  "wanted",
  "fridge",
  "foodbank",
  "business",
  "volunteer",
  "challenge",
  "zerowaste",
  "vegan",
  "forum",
];

// Map URL params to categoryMetadata keys
const categoryKeyMap: Record<string, keyof typeof categoryMetadata> = {
  food: "food",
  thing: "things",
  things: "things",
  borrow: "borrow",
  wanted: "wanted",
  fridge: "fridges",
  fridges: "fridges",
  foodbank: "foodbanks",
  foodbanks: "foodbanks",
  business: "business",
  volunteer: "volunteer",
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const type = params.type || "food";
  const categoryKey = categoryKeyMap[type] || "food";
  const category = categoryMetadata[categoryKey];

  return generatePageMetadata({
    title: category.title,
    description: category.description,
    keywords: category.keywords,
    path: type === "food" ? "/food" : `/food?type=${type}`,
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

  // Validate coordinates
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

  // Clamp radius to reasonable bounds (100m to 100km)
  const clampedRadius = Math.max(100, Math.min(100000, radius));

  return { lat, lng, radius: clampedRadius };
}

/**
 * Food/Products Listings Page - Server Component
 *
 * Supports location-based filtering via URL searchParams:
 * - ?lat=51.5074&lng=-0.1278&radius=5000 - fetch posts within 5km of London
 * - Without location params, fetches all products of the type
 */
export default async function ProductsPage({ searchParams }: PageProps) {
  // First check if DB is healthy
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    redirect("/maintenance");
  }

  const params = await searchParams;
  const productType = params.type && CATEGORY_PATHS.includes(params.type) ? params.type : "food";

  // Parse location params for nearby filtering
  const locationParams = parseLocationParams(params);
  const isLocationFiltered = locationParams !== null;

  // If location params provided, fetch nearby posts using PostGIS
  if (isLocationFiltered) {
    let nearbyPosts: Awaited<ReturnType<typeof getNearbyPosts>>["data"] = [];
    try {
      const result = await getNearbyPosts({
        lat: locationParams.lat,
        lng: locationParams.lng,
        radiusMeters: locationParams.radius,
        postType: productType === "challenge" ? null : productType,
        limit: 100,
      });
      nearbyPosts = result.data;
    } catch {
      redirect("/maintenance");
    }

    return (
      <Suspense fallback={<ProductsPageSkeleton />}>
        <HomeClient
          initialProducts={[]}
          productType={productType}
          nearbyPosts={nearbyPosts}
          isLocationFiltered={true}
          radiusMeters={locationParams.radius}
        />
      </Suspense>
    );
  }

  // No location filter - fetch all products of type
  let products: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    products = productType === "challenge" ? await getChallenges() : await getProducts(productType);
  } catch {
    redirect("/maintenance");
  }

  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <HomeClient initialProducts={products} productType={productType} />
    </Suspense>
  );
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
