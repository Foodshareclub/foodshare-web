import { Suspense } from "react";
import type { Metadata } from "next";
import { getProducts } from "@/lib/data/products";
import { getChallenges } from "@/lib/data/challenges";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getAuthSession } from "@/lib/data/auth";
import { HomeClient } from "@/app/HomeClient";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { categoryMetadata, generatePageMetadata, siteConfig } from "@/lib/metadata";
import { generateItemListJsonLd, safeJsonLdStringify } from "@/lib/jsonld";

export const CATEGORY_PATHS = [
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
export const categoryKeyMap: Record<string, keyof typeof categoryMetadata> = {
  food: "food",
  thing: "things",
  things: "things",
  borrow: "borrow",
  wanted: "wanted",
  fridge: "fridges",
  fridges: "fridges",
  foodbank: "foodbanks",
  foodbanks: "foodbanks",
  business: "organisations",
  organisation: "organisations",
  organisations: "organisations",
  volunteer: "volunteers",
  volunteers: "volunteers",
  challenge: "challenges",
  challenges: "challenges",
  zerowaste: "zerowaste",
  vegan: "vegan",
};

export interface PageProps {
  searchParams: Promise<{
    type?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

/**
 * Parse and validate location params from URL
 */
export function parseLocationParams(
  params: {
    lat?: string;
    lng?: string;
    radius?: string;
  },
  defaultRadius: number = 5000
): { lat: number; lng: number; radius: number } | null {
  const lat = params.lat ? parseFloat(params.lat) : null;
  const lng = params.lng ? parseFloat(params.lng) : null;
  const radius = params.radius ? parseInt(params.radius, 10) : defaultRadius;

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

export async function generateCategoryMetadata(type: string, searchParams: Promise<any>): Promise<Metadata> {
  const params = await searchParams;
  const categoryKey = categoryKeyMap[type] || "food";
  const category = categoryMetadata[categoryKey];

  return generatePageMetadata({
    title: category.title,
    description: category.description,
    keywords: category.keywords,
    path: type === "food" ? "/food" : `/${type}`,
  });
}

export default async function CategoryPageContent({ type, searchParams }: { type: string } & PageProps) {
  const params = await searchParams;
  const productType = type;

  // Fetch session to get user settings (like search radius)
  const session = await getAuthSession();
  const userRadiusMeters = (session.user?.profile?.search_radius_km || 5) * 1000;

  // Parse location params for nearby filtering
  const locationParams = parseLocationParams(params, userRadiusMeters);
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
    } catch (error) {
      console.error("Failed to fetch nearby posts:", error);
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
  } catch (error) {
    console.error("Failed to fetch products:", error);
  }

  // Generate ItemList structured data for SEO (first 10 items for rich carousel)
  const categoryKey = categoryKeyMap[productType] || "food";
  const category = categoryMetadata[categoryKey];
  const itemListJsonLd = generateItemListJsonLd({
    name: `${category.title} on FoodShare`,
    description: category.description,
    items: products.slice(0, 10).map((product, index) => ({
      name: product.post_name || "Item",
      url: `${siteConfig.url}/food/${product.id}`,
      image: product.images?.[0],
      position: index + 1,
    })),
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(itemListJsonLd) }}
      />
      <Suspense fallback={<ProductsPageSkeleton />}>
        <HomeClient
          initialProducts={products}
          productType={productType}
          radiusMeters={userRadiusMeters}
        />
      </Suspense>
    </>
  );
}

export function ProductsPageSkeleton() {
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
