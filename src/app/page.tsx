import { Suspense } from "react";
import { redirect } from "next/navigation";
import { HomeClient } from "./HomeClient";
import { getProductsPaginated } from "@/lib/data/products";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getAuthSession } from "@/lib/data/auth";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { createRequestLogger } from "@/lib/structured-logger";
import { siteConfig } from "@/lib/metadata";

interface PageProps {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

/**
 * Parse and validate location params from URL
 */
function parseLocationParams(
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

  return { lat, lng, radius: Math.max(100, Math.min(100000, radius)) };
}

/**
 * Generate page-specific JSON-LD structured data
 * Note: Organization, WebSite, and SoftwareApplication are already in layout.tsx
 */
function generateJsonLdScripts(): React.ReactNode {
  // Only generate breadcrumb (page-specific) - other schemas are in layout.tsx
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([{ name: "Home", url: siteConfig.url }]);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
    />
  );
}

/**
 * Fetch data for the home page
 * Returns null on error to trigger maintenance redirect
 */
async function fetchHomeData(locationParams: { lat: number; lng: number; radius: number } | null) {
  try {
    if (locationParams) {
      // Location-based: fetch nearby posts using PostGIS
      const result = await getNearbyPosts({
        lat: locationParams.lat,
        lng: locationParams.lng,
        radiusMeters: locationParams.radius,
        postType: "food",
        limit: 20,
      });
      return {
        type: "nearby" as const,
        data: result.data,
        radius: locationParams.radius,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    }

    // No location filter - fetch paginated food products
    const result = await getProductsPaginated("food", { limit: 20 });
    return {
      type: "all" as const,
      data: result.data,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    };
  } catch {
    return null;
  }
}

/**
 * Home Page - Server Component
 * Supports location-based filtering via URL params: ?lat=X&lng=Y&radius=Z
 */
export default async function Home({ searchParams }: PageProps) {
  const logger = await createRequestLogger({ action: "Home" });
  const params = await searchParams;

  // Fetch session to get user settings (like search radius)
  const session = await getAuthSession();
  const userRadiusMeters = (session.user?.profile?.search_radius_km || 5) * 1000;

  const locationParams = parseLocationParams(params, userRadiusMeters);

  // Fetch data outside of JSX rendering
  const homeData = await fetchHomeData(locationParams);
  if (!homeData) {
    logger.error("Home data fetch failed");
    return <HomePageSkeleton />;
  }

  // Render based on data type
  if (homeData.type === "nearby") {
    return (
      <>
        {generateJsonLdScripts()}
        <Suspense fallback={<HomePageSkeleton />}>
          <HomeClient
            initialProducts={[]}
            productType="food"
            nearbyPosts={homeData.data}
            isLocationFiltered={true}
            radiusMeters={homeData.radius}
            initialHasMore={homeData.hasMore}
            initialNextCursor={homeData.nextCursor}
          />
        </Suspense>
      </>
    );
  }

  return (
    <>
      {generateJsonLdScripts()}
      <Suspense fallback={<HomePageSkeleton />}>
        <HomeClient
          initialProducts={homeData.data}
          productType="food"
          radiusMeters={userRadiusMeters}
          initialHasMore={homeData.hasMore}
          initialNextCursor={homeData.nextCursor}
        />
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
