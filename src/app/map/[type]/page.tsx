import { Suspense } from "react";
import { Metadata } from "next";
import { MapClient } from "./MapClient";
import { getMapLocations } from "@/lib/data/maps";
import { getUser } from "@/app/actions/auth";
import { urlToDbType } from "@/utils/categoryMapping";
import { categoryMetadata, siteConfig } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ type: string }>;
}

// Map URL slugs to category keys
const categoryMap: Record<string, keyof typeof categoryMetadata> = {
  food: "food",
  things: "things",
  borrow: "borrow",
  wanted: "wanted",
  foodbanks: "foodbanks",
  fridges: "fridges",
  organisations: "organisations",
  volunteers: "volunteers",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type = "food" } = await params;
  const category = categoryMap[type] || "food";
  const meta = categoryMetadata[category];
  const pageUrl = `${siteConfig.url}/map/${type}`;

  return {
    title: `${meta.title} Map`,
    description: `Find ${meta.title.toLowerCase()} near you on the interactive map. ${meta.description}`,
    keywords: [...meta.keywords, "map", "near me", "local", "location"],
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: pageUrl,
      siteName: siteConfig.name,
      title: `${meta.title} Map | ${siteConfig.name}`,
      description: `Find ${meta.title.toLowerCase()} near you on the interactive map.`,
    },
    twitter: {
      card: "summary_large_image",
      site: siteConfig.twitterHandle,
      creator: siteConfig.twitterHandle,
      title: `${meta.title} Map | ${siteConfig.name}`,
      description: `Find ${meta.title.toLowerCase()} near you on the interactive map.`,
    },
  };
}

/**
 * Map Page - Server Component
 * Fetches product locations on the server and passes to MapClient
 */
export default async function MapPage({ params }: PageProps) {
  const { type = "food" } = await params;

  // Convert URL slug to database type
  const dbType = urlToDbType(type);

  // Fetch data in parallel on the server (cached via unstable_cache)
  const [locations, user] = await Promise.all([getMapLocations(dbType), getUser()]);

  return (
    <Suspense fallback={<MapPageSkeleton type={type} />}>
      <MapClient type={type} initialLocations={locations} user={user} />
    </Suspense>
  );
}

/**
 * Skeleton loader for the map page
 */
function MapPageSkeleton({ type }: { type: string }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar skeleton */}
      <div className="h-[140px] bg-card border-b border-border animate-pulse" />

      {/* Map skeleton */}
      <div className="relative h-map w-full">
        <div className="h-full w-full animate-pulse bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">Loading {type} map...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
