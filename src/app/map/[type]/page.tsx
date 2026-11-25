import { getUser } from "@/app/actions/auth";
import { getNearbyLocations } from "@/lib/data/maps";
import { resolveServerLocation } from "@/lib/location/server-location";
import { categoryMetadata, siteConfig } from "@/lib/metadata";
import type { LocationType } from "@/types/product.types";
import { urlToDbType } from "@/utils/categoryMapping";
import type { Metadata } from "next";
import { Suspense } from "react";
import { MapClient } from "./MapLoader";

interface PageProps {
  params: Promise<{ type: string }>;
  searchParams?: Promise<{
    lat?: string;
    lng?: string;
    radius?: string;
    distance?: string;
  }>;
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
 * Preloads user location (cookie / edge headers) and initial nearby markers
 * for immediate full-sized map paint without a "No items found" flash.
 */
export default async function MapPage({ params, searchParams }: PageProps) {
  const [{ type = "food" }, resolvedSearch] = await Promise.all([
    params,
    searchParams ? searchParams.catch(() => ({})) : Promise.resolve({}),
  ]);

  const [user, serverLocation] = await Promise.all([
    getUser().catch(() => null),
    resolveServerLocation({ searchParams: resolvedSearch ?? {} }).catch(() => null),
  ]);

  let initialLocations: LocationType[] = [];
  if (serverLocation) {
    try {
      const dbType = type.toLowerCase() === "all" ? undefined : urlToDbType(type);
      const pad = 0.6;
      initialLocations = await getNearbyLocations(
        {
          north: Math.min(90, serverLocation.lat + pad),
          south: Math.max(-90, serverLocation.lat - pad),
          east: Math.min(180, serverLocation.lng + pad),
          west: Math.max(-180, serverLocation.lng - pad),
        },
        dbType,
        500,
      );
    } catch {
      initialLocations = [];
    }
  }

  return (
    <Suspense fallback={<MapPageSkeleton type={type} />}>
      <MapClient
        type={type}
        initialLocations={initialLocations}
        initialLocation={
          serverLocation
            ? {
                latitude: serverLocation.lat,
                longitude: serverLocation.lng,
                city: serverLocation.city,
                country: serverLocation.country,
                source: serverLocation.source,
                approximate: serverLocation.approximate,
              }
            : null
        }
        user={user}
      />
    </Suspense>
  );
}

/**
 * Skeleton loader for the map page
 */
function MapPageSkeleton({ type }: { type: string }) {
  return (
    <div data-map-page className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Navbar skeleton */}
      <div className="h-[170px] shrink-0 bg-card border-b border-border animate-pulse" />

      {/* Map skeleton */}
      <div className="relative flex-1 min-h-0 w-full">
        <div className="absolute inset-0 animate-pulse bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <p className="text-muted-foreground">Loading {type} map...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
