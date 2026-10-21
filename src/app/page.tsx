const HOME_SKELETON_KEYS = ["h-1", "h-2", "h-3", "h-4", "h-5", "h-6", "h-7", "h-8"] as const;

import { Suspense } from "react";

import SkeletonCard from "@/components/productCard/SkeletonCard";
import { LISTING_CONTAINER, LISTING_GRID } from "@/components/productCard/listing-layout";
import { CategoryCard } from "@/components/ui/category-card";
import { HeroSection, HeroStat } from "@/components/ui/hero-section";
import { MobileNav } from "@/components/ui/mobile-nav";
import { PremiumButton } from "@/components/ui/premium-button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { SectionDivider } from "@/components/ui/section-divider";
import { getAuthSession } from "@/lib/data/auth";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { getProductsPaginated } from "@/lib/data/products";
import { type PublicStats, getCategoryCounts, getPublicStats } from "@/lib/data/public-stats";
import { generateBreadcrumbJsonLd, safeJsonLdStringify } from "@/lib/jsonld";
import { generatePageMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/metadata";
import { formatFoodSaved, makeCompactFormatter } from "@/lib/numbers";
import { createRequestLogger } from "@/lib/structured-logger";
import { cn } from "@/lib/utils";
import { PATH } from "@/utils";
import {
  Apple,
  Building2,
  HandHelping,
  HeartHandshake,
  Landmark,
  Leaf,
  type LucideIcon,
  MessageCircle,
  Package,
  PlusCircle,
  Recycle,
  Refrigerator,
  Search,
  Share2,
} from "lucide-react";
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
 * Parse and validate location params from URL
 */
function parseLocationParams(
  params: {
    lat?: string;
    lng?: string;
    radius?: string;
  },
  defaultRadius = 5000,
): { lat: number; lng: number; radius: number } | null {
  const lat = params.lat ? Number.parseFloat(params.lat) : null;
  const lng = params.lng ? Number.parseFloat(params.lng) : null;
  const radius = params.radius ? Number.parseInt(params.radius, 10) : defaultRadius;

  if (
    lat === null ||
    lng === null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
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
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD needs a raw script tag; safeJsonLdStringify escapes angle brackets and ampersands so a script-tag breakout is impossible
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
      // Location-based: fetch nearby posts using PostGIS.
      // Use the user's configured radius (NOT a hardcoded 50km) so the first
      // page is genuinely local. Expansion on scroll is handled client-side.
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

// ============================================================================
// Category grid configuration
// ============================================================================

/**
 * Display metadata for each browsable post type: the route it links to, the
 * icon it draws, and the key its name takes in the existing `categories`
 * namespace — the navbar already translates these, so the homepage and the
 * nav can never drift into calling the same thing by two names.
 */
const CATEGORY_META: Record<string, { href: string; icon: LucideIcon; nameKey: string }> = {
  food: { href: PATH.food, icon: Apple, nameKey: "food" },
  thing: { href: PATH.thing, icon: Package, nameKey: "things" },
  borrow: { href: PATH.borrow, icon: HandHelping, nameKey: "borrow" },
  wanted: { href: PATH.wanted, icon: Search, nameKey: "wanted" },
  fridge: { href: PATH.fridge, icon: Refrigerator, nameKey: "fridges" },
  foodbank: { href: PATH.foodbank, icon: Landmark, nameKey: "foodbanks" },
  volunteer: { href: PATH.volunteer, icon: HeartHandshake, nameKey: "volunteers" },
  vegan: { href: PATH.vegan, icon: Leaf, nameKey: "vegan" },
  zerowaste: { href: PATH.zerowaste, icon: Recycle, nameKey: "zerowaste" },
  business: { href: PATH.organisation, icon: Building2, nameKey: "organisations" },
};

const HOW_IT_WORKS_STEPS = [
  { icon: PlusCircle, titleKey: "how_step1_title", descKey: "how_step1_desc" },
  { icon: MessageCircle, titleKey: "how_step2_title", descKey: "how_step2_desc" },
  { icon: Share2, titleKey: "how_step3_title", descKey: "how_step3_desc" },
] as const;

// ============================================================================
// Page
// ============================================================================

/**
 * Home Page - Server Component
 * Supports location-based filtering via URL params: ?lat=X&lng=Y&radius=Z
 */
export default async function Home({ searchParams }: PageProps) {
  const logger = await createRequestLogger({ action: "Home" });
  const params = await searchParams;
  const [t, tCategories, locale] = await Promise.all([
    getTranslations("Home"),
    getTranslations("categories"),
    getLocale(),
  ]);

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

  const formatCompact = makeCompactFormatter(locale);

  // Hero stats are an enhancement, not the page's purpose: if the counts fail,
  // the hero renders without its stats band rather than taking the feed — the
  // reason the visitor is here — down with it.
  let stats: PublicStats | null = null;
  try {
    stats = await getPublicStats();
  } catch (error) {
    logger.error("Public stats fetch failed", { error });
  }

  // Category counts are decorative next to the names; same degradation.
  let categoryCounts: Awaited<ReturnType<typeof getCategoryCounts>> | null = null;
  try {
    categoryCounts = await getCategoryCounts();
  } catch (error) {
    logger.error("Category counts fetch failed", { error });
  }

  const countByType = new Map((categoryCounts ?? []).map((c) => [c.type, c.count]));

  const heroStats = stats && (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
      <HeroStat value={formatCompact(stats.activeListings)} label={t("hero_stat_listings")} />
      <HeroStat value={formatFoodSaved(stats.foodSavedKg, formatCompact)} label={t("hero_stat_food_saved")} />
      <HeroStat value={formatCompact(stats.members)} label={t("hero_stat_members")} />
    </div>
  );

  const categoriesSection = (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t("categories_title")}</h2>
            <p className="max-w-xl text-muted-foreground">{t("categories_subtitle")}</p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={150}>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(CATEGORY_META).map(([type, meta]) => (
              <CategoryCard
                key={type}
                icon={meta.icon}
                title={tCategories(meta.nameKey)}
                href={meta.href}
                count={countByType.get(type) ?? 0}
                countLabel={t("categories_items", { count: countByType.get(type) ?? 0 })}
              />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );

  const howItWorksSection = (
    <section className="relative py-16 sm:py-20 bg-muted/30 dark:bg-muted/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t("how_title")}</h2>
            <p className="max-w-xl text-muted-foreground">{t("how_subtitle")}</p>
          </div>
        </ScrollReveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <ScrollReveal key={step.titleKey} delay={index * 120}>
              <div className="group relative flex h-full flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card p-8 text-center transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] hover:border-primary/30 hover:shadow-[0_8px_32px_rgba(255,45,85,0.1)] hover:-translate-y-1">
                <span className="absolute end-4 top-4 text-5xl font-bold text-primary/10 transition-colors duration-500 group-hover:text-primary/20">
                  {index + 1}
                </span>
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-500 group-hover:scale-110">
                  <step.icon className="size-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{t(step.titleKey)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(step.descKey)}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );

  const ctaSection = (
    <section className="relative overflow-hidden py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t("cta_title")}</h2>
            <p className="max-w-xl text-lg text-muted-foreground">{t("cta_subtitle")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PremiumButton href={PATH.authLogin} size="lg">
                {t("cta_primary")}
              </PremiumButton>
              <PremiumButton href={PATH.food} variant="outline" size="lg">
                {t("cta_secondary")}
              </PremiumButton>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );

  const mobileNav = (
    <MobileNav
      label={t("main_navigation")}
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

  const feed = (
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
  );

  // Render based on data type
  if (homeData.type === "nearby") {
    return (
      <>
        {generateJsonLdScripts()}
        <HeroSection
          badge={t("hero_badge")}
          title={t("hero_title")}
          subtitle={t("hero_subtitle")}
          gradientVariant="primary"
        >
          {heroStats}
        </HeroSection>
        {feed}
        {mobileNav}
      </>
    );
  }

  return (
    <>
      {generateJsonLdScripts()}
      <HeroSection
        badge={t("hero_badge")}
        title={t("hero_title")}
        subtitle={t("hero_subtitle")}
        gradientVariant="primary"
      >
        {heroStats}
      </HeroSection>
      {feed}
      <SectionDivider />
      {categoriesSection}
      <SectionDivider />
      {howItWorksSection}
      <SectionDivider />
      {ctaSection}
      {/* Bottom padding so the fixed mobile nav never covers the footer */}
      <div className="h-16 sm:hidden" />
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
