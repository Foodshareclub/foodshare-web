import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductsPaginated } from "@/lib/data/products";
import { getChallenges } from "@/lib/data/challenges";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getAuthSession } from "@/lib/data/auth";
import { HomeClient } from "@/app/HomeClient";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "@/components/productCard/listing-layout";
import { cn } from "@/lib/utils";
import { categoryMetadata, generatePageMetadata, siteConfig } from "@/lib/metadata";
import { generateItemListJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { createRequestLogger } from "@/lib/structured-logger";
import { parseSearchLocation, parseSearchRadius } from "@/lib/listing-search";

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
    key_word?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    distance?: string;
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
  const location = parseSearchLocation({ get: (name) => params[name as "lat" | "lng"] ?? null });
  return location ? { ...location, radius: parseSearchRadius(params.radius, defaultRadius) } : null;
}

export async function generateCategoryMetadata(
  type: string,
  _searchParams: Promise<{ [key: string]: string | string[] | undefined }>
): Promise<Metadata> {
  const categoryKey = categoryKeyMap[type] || "food";
  const category = categoryMetadata[categoryKey];

  return generatePageMetadata({
    title: category.title,
    description: category.description,
    keywords: category.keywords,
    path: type === "food" ? "/food" : `/${type}`,
  });
}

export default async function CategoryPageContent({
  type,
  searchParams,
}: { type: string } & PageProps) {
  const logger = await createRequestLogger({ action: "CategoryPageContent", type });
  const params = await searchParams;
  const productType = type;
  const searchTerm = typeof params.key_word === "string" ? params.key_word.trim() : "";

  // Fetch session to get user settings (like search radius)
  const session = await getAuthSession();
  const userRadiusMeters = (session.user?.profile?.search_radius_km || 5) * 1000;

  // Parse location params for nearby filtering
  const locationParams =
    params.distance === "any" ? null : parseLocationParams(params, userRadiusMeters);
  const isLocationFiltered = locationParams !== null;

  // If location params provided, fetch nearby posts using PostGIS
  if (isLocationFiltered) {
    let initialLoadFailed = false;
    let nearbyResult: Awaited<ReturnType<typeof getNearbyPosts>> = {
      data: [],
      hasMore: false,
      nextCursor: null,
    };
    try {
      nearbyResult = await getNearbyPosts({
        lat: locationParams.lat,
        lng: locationParams.lng,
        // Use the user's configured radius (NOT a hardcoded 50km) so the first
        // page is genuinely local. Expansion on scroll is handled client-side.
        radiusMeters: locationParams.radius,
        postType: productType === "challenge" ? null : productType,
        searchTerm,
        limit: 20,
      });
    } catch (error) {
      initialLoadFailed = true;
      logger.error("Failed to fetch nearby posts", error);
    }

    return (
      <Suspense fallback={<ProductsPageSkeleton />}>
        <HomeClient
          key={`${productType}:${searchTerm}:${locationParams.lat}:${locationParams.lng}:${locationParams.radius}:${params.distance}`}
          initialProducts={[]}
          initialLoadFailed={initialLoadFailed}
          searchTerm={searchTerm}
          productType={productType}
          nearbyPosts={nearbyResult.data}
          isLocationFiltered={true}
          radiusMeters={locationParams.radius}
          initialHasMore={nearbyResult.hasMore}
          initialNextCursor={nearbyResult.nextCursor}
        />
      </Suspense>
    );
  }

  // No location filter - fetch paginated products of type
  let initialLoadFailed = false;
  let paginatedResult: Awaited<ReturnType<typeof getProductsPaginated>> = {
    data: [],
    hasMore: false,
    nextCursor: null,
  };
  try {
    if (productType === "challenge") {
      const challengeData = await getChallenges();
      paginatedResult = { data: challengeData, hasMore: false, nextCursor: null };
    } else {
      paginatedResult = await getProductsPaginated(productType, { limit: 20, searchTerm });
    }
  } catch (error) {
    initialLoadFailed = true;
    logger.error("Failed to fetch products", error);
  }

  // Generate ItemList structured data for SEO (first 10 items for rich carousel)
  const categoryKey = categoryKeyMap[productType] || "food";
  const category = categoryMetadata[categoryKey];
  const itemListJsonLd = generateItemListJsonLd({
    name: `${category.title} on FoodShare`,
    description: category.description,
    items: paginatedResult.data.slice(0, 10).map((product, index) => ({
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
          key={`${productType}:${searchTerm}`}
          initialProducts={paginatedResult.data}
          initialLoadFailed={initialLoadFailed}
          searchTerm={searchTerm}
          productType={productType}
          radiusMeters={userRadiusMeters}
          initialHasMore={paginatedResult.hasMore}
          initialNextCursor={paginatedResult.nextCursor}
        />
      </Suspense>
    </>
  );
}

export function ProductsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn(LISTING_CONTAINER, "py-6 sm:py-8")}>
        <div className={LISTING_GRID}>
          {[...Array(10)].map((_, i) => (
            <SkeletonCard key={i} isLoaded={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
