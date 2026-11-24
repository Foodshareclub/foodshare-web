const HOME_SKELETON_KEYS = ["h-1", "h-2", "h-3", "h-4", "h-5", "h-6", "h-7", "h-8"] as const;

import { Suspense } from "react";

import SkeletonCard from "@/components/productCard/SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "@/components/productCard/listing-layout";
import { MobileNav } from "@/components/ui/mobile-nav";
import { getAuthSession } from "@/lib/data/auth";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getProductsPaginated } from "@/lib/data/products";
import { resolveServerLocation, type ResolvedServerLocation } from "@/lib/location/server-location";
import { generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { generatePageMetadata, siteConfig } from "@/lib/metadata";
import { createRequestLogger } from "@/lib/structured-logger";
import { cn } from "@/lib/utils";
import { PATH } from "@/utils";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { HomeClient } from "./HomeClient";

interface PageProps {
  searchParams: Promise<{
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("Home"), getLocale()]);

  return generatePageMetadata({
    title: t("meta_title"),
    description: t("meta_description"),
    keywords: ["food sharing", "reduce food waste", "community", "free food", "sustainability"],
    path: "/",
    locale,
  });
}

/**
 * Generate page-specific JSON-LD structured data
 */
function generateJsonLdScripts(): React.ReactNode {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([{ name: "Home", url: siteConfig.url }]);

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs a raw script tag; safeJsonLdStringify escapes angle brackets and ampersands so a script-tag breakout is impossible
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
    />
  );
}

/**
 * Fetch data for the home page
 * Returns null on error to trigger skeleton fallback
 */
async function fetchHomeData(locationParams: ResolvedServerLocation | null) {
  try {
    if (locationParams) {
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
 * Clean, Airbnb-inspired listing layout:
 * Immediately surfaces the responsive listing grid right under the header and category bar.
 */
export default async function Home({ searchParams }: PageProps) {
  const logger = await createRequestLogger({ action: "Home" });
  const params = await searchParams;
  const t = await getTranslations("Home");

  // Fetch session to get user settings (like search radius)
  const session = await getAuthSession();
  const userRadiusMeters = (session.user?.profile?.search_radius_km || 5) * 1000;

  const locationParams = await resolveServerLocation({
    searchParams: params,
    defaultRadius: userRadiusMeters,
  });

  // Fetch data outside of JSX rendering
  const homeData = await fetchHomeData(locationParams);
  if (!homeData) {
    logger.error("Home data fetch failed");
    return <HomePageSkeleton />;
  }

  const mobileNav = (
    <MobileNav
      label={t("main_navigation")}
      // Phone-only: from `sm` up the header carries the same navigation, and a
      // full-width bar at z-50 sat on top of the floating "Show map" pill
      // (bottom-8 from `md`), so desktop visitors could not click it. The
      // spacer below is `sm:hidden` for the same reason.
      className="sm:hidden"
      // The icons are named, not passed: the navigation is a client
      // component and a component reference cannot cross that boundary.
      items={[
        { href: PATH.main, icon: "home", label: t("nav_home") },
        { href: "/map/food", icon: "map", label: t("nav_map") },
        { href: PATH.food, icon: "search", label: t("nav_search") },
        { href: "/profile", icon: "profile", label: t("nav_profile") },
      ]}
    />
  );

  return (
    <>
      {generateJsonLdScripts()}
      <Suspense fallback={<HomePageSkeleton />}>
        {homeData.type === "nearby" ? (
          <HomeClient
            initialProducts={[]}
            productType="food"
            nearbyPosts={homeData.data}
            isLocationFiltered={true}
            radiusMeters={homeData.radius}
            initialHasMore={homeData.hasMore}
            initialNextCursor={homeData.nextCursor}
            initialLocation={
              locationParams
                ? {
                    latitude: locationParams.lat,
                    longitude: locationParams.lng,
                    city: locationParams.city,
                    country: locationParams.country,
                    source: locationParams.source,
                    approximate: locationParams.approximate,
                  }
                : null
            }
          />
        ) : (
          <HomeClient
            initialProducts={homeData.data}
            productType="food"
            radiusMeters={userRadiusMeters}
            initialHasMore={homeData.hasMore}
            initialNextCursor={homeData.nextCursor}
          />
        )}
      </Suspense>
      {/* Bottom padding on mobile so the fixed mobile nav never covers the feed */}
      <div className="h-16 md:hidden" />
      {mobileNav}
    </>
  );
}

function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className={cn(LISTING_CONTAINER, "py-6 sm:py-8")}>
        <div className={LISTING_GRID}>
          {HOME_SKELETON_KEYS.map((skeletonKey) => (
            <SkeletonCard key={skeletonKey} isLoaded={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
