import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { searchProducts, getProducts } from "@/lib/data/products";
import { getNearbyPosts } from "@/lib/data/nearby-posts";
import { HomeClient } from "@/app/HomeClient";
import SkeletonCard from "@/components/productCard/SkeletonCard";
import { categoryMetadata, generatePageMetadata } from "@/lib/metadata";

// Valid category URL paths (plural form for consistency)
const CATEGORY_PATHS = [
  "all",
  "food",
  "things",
  "borrow",
  "wanted",
  "fridges",
  "foodbanks",
  "organisations",
  "volunteers",
  "challenges",
  "zerowaste",
  "vegan",
  "forum",
];

// Map URL paths to database post_type values (singular form)
const URL_TO_POST_TYPE: Record<string, string> = {
  food: "food",
  things: "thing",
  borrow: "borrow",
  wanted: "wanted",
  fridges: "fridge",
  foodbanks: "foodbank",
  organisations: "business",
  volunteers: "volunteer",
  challenges: "challenge",
  zerowaste: "zerowaste",
  vegan: "vegan",
  forum: "forum",
};

// Map URL paths to categoryMetadata keys
const categoryKeyMap: Record<string, keyof typeof categoryMetadata> = {
  food: "food",
  things: "things",
  borrow: "borrow",
  wanted: "wanted",
  fridges: "fridges",
  foodbanks: "foodbanks",
  volunteers: "volunteer",
  organisations: "business",
};

// Legacy singular paths that should redirect to plural
const LEGACY_REDIRECTS: Record<string, string> = {
  thing: "things",
  fridge: "fridges",
  foodbank: "foodbanks",
  business: "organisations",
  volunteer: "volunteers",
};

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{
    key_word?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryKey = categoryKeyMap[category];

  if (categoryKey && categoryMetadata[categoryKey]) {
    const meta = categoryMetadata[categoryKey];
    return generatePageMetadata({
      title: meta.title,
      description: meta.description,
      keywords: meta.keywords,
      path: `/${category}`,
    });
  }

  return generatePageMetadata({
    title: "Browse Listings",
    description: "Browse and discover food and items shared by your community.",
    path: `/${category}`,
  });
}

/**
 * Validates if the category is supported
 */
function isValidCategory(category: string): boolean {
  return CATEGORY_PATHS.includes(category);
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
 * Root Category Page - Handles /{category} routes
 * Supports location-based filtering via URL params: ?lat=X&lng=Y&radius=Z
 */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ category }, searchParamsResolved] = await Promise.all([params, searchParams]);
  const { key_word } = searchParamsResolved;
  const lowerCategory = category.toLowerCase();

  // 1. Handle legacy singular paths (redirect to plural)
  if (LEGACY_REDIRECTS[lowerCategory]) {
    redirect(`/${LEGACY_REDIRECTS[lowerCategory]}`);
  }

  // 2. Validate category - if invalid, 404 (this protects other static routes)
  if (!isValidCategory(lowerCategory)) {
    notFound();
  }

  // 3. Handle special redirections
  if (lowerCategory === "forum") {
    redirect("/forum");
  }
  if (lowerCategory === "challenges") {
    redirect("/challenge");
  }

  // 4. Map URL path to database post_type
  const dbPostType = lowerCategory === "all" ? "food" : URL_TO_POST_TYPE[lowerCategory] || "food";

  // 5. Parse location params for nearby filtering
  const locationParams = parseLocationParams(searchParamsResolved);
  const isLocationFiltered = locationParams !== null && !key_word; // Don't combine with search

  // 6. Fetch data based on filters
  if (isLocationFiltered) {
    const { data: nearbyPosts } = await getNearbyPosts({
      lat: locationParams.lat,
      lng: locationParams.lng,
      radiusMeters: locationParams.radius,
      postType: dbPostType,
      limit: 100,
    });

    return (
      <Suspense fallback={<SearchPageSkeleton />}>
        <HomeClient
          initialProducts={[]}
          productType={dbPostType}
          nearbyPosts={nearbyPosts}
          isLocationFiltered={true}
          radiusMeters={locationParams.radius}
        />
      </Suspense>
    );
  }

  // Regular fetch (with optional search)
  const products = key_word
    ? await searchProducts(key_word, dbPostType)
    : await getProducts(dbPostType);

  return (
    <Suspense fallback={<SearchPageSkeleton />}>
      <HomeClient initialProducts={products} productType={dbPostType} />
    </Suspense>
  );
}

function SearchPageSkeleton() {
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
