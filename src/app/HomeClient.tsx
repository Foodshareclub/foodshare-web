"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ProductGrid } from "@/components/productCard/ProductGrid";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { useUIStore } from "@/store/zustand/useUIStore";
import { fetchNearbyListings, fetchProductsPaginated } from "@/app/actions/nearby-listings";
import type { InitialProductStateType } from "@/types/product.types";
import type { NearbyPost } from "@/lib/data/nearby-posts";

/** Format distance for display - miles for US (en), km for others */
function formatDistance(meters: number, locale: string): string {
  if (locale === "en") {
    const miles = meters / 1609.34;
    return `${Math.round(miles)} miles`;
  }
  const km = meters / 1000;
  return `${Math.round(km)} km`;
}

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  productType?: string;
  /** Nearby posts with distance (when location filter is active) */
  nearbyPosts?: NearbyPost[] | null;
  /** Whether location filter is currently active */
  isLocationFiltered?: boolean;
  /** Current radius in meters */
  radiusMeters?: number;
  /** Whether more pages are available (from server) */
  initialHasMore?: boolean;
  /** Cursor for next page (from server) */
  initialNextCursor?: number | null;
}

// Default search radius in meters (5km)
const DEFAULT_RADIUS_METERS = 5000;

/**
 * HomeClient - Client wrapper for the home page
 * Automatically detects user location and shows nearby posts
 *
 * Flow:
 * 1. On mount, check if URL already has location params (server-rendered with nearby data)
 * 2. If not, request browser geolocation automatically
 * 3. Once location is obtained, fetch nearby posts via Server Action (no server re-render)
 * 4. Update URL with history.replaceState for shareability (no navigation)
 * 5. Infinite scroll loads more pages via Server Actions
 */
export function HomeClient({
  initialProducts,
  productType = "food",
  nearbyPosts,
  isLocationFiltered = false,
  radiusMeters = DEFAULT_RADIUS_METERS,
  initialHasMore = false,
  initialNextCursor = null,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const locale = useLocale();

  // Get stored location from Zustand (persisted across sessions)
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);
  const geoDistance = useUIStore((state) => state.geoDistance);

  // Client-side nearby posts state (populated after geolocation detection)
  const [clientNearbyPosts, setClientNearbyPosts] = useState<NearbyPost[] | null>(null);
  const [isClientLocationFiltered, setIsClientLocationFiltered] = useState(false);
  const [clientRadius, setClientRadius] = useState(radiusMeters);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);

  // Pagination state
  const [extraProducts, setExtraProducts] = useState<InitialProductStateType[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Track location for paginated nearby fetching
  const locationRef = useRef<{ lat: number; lng: number; radius: number } | null>(null);

  // Use server-rendered nearby posts if available, otherwise use client-fetched ones
  const effectiveNearbyPosts = isLocationFiltered ? nearbyPosts : clientNearbyPosts;
  const effectiveIsLocationFiltered = isLocationFiltered || isClientLocationFiltered;
  const effectiveRadius = isLocationFiltered ? radiusMeters : clientRadius;

  const baseProducts =
    effectiveIsLocationFiltered && effectiveNearbyPosts
      ? (effectiveNearbyPosts as unknown as InitialProductStateType[])
      : initialProducts;

  // Combine base products with extra pages loaded via infinite scroll
  const products = [...baseProducts, ...extraProducts];

  // Fetch nearby posts via Server Action (no server re-render)
  const fetchNearby = useCallback(
    async (lat: number, lng: number, radius: number) => {
      setIsFetchingNearby(true);
      try {
        const result = await fetchNearbyListings({ lat, lng, radius });
        if (result.success) {
          setClientNearbyPosts(result.data);
          setIsClientLocationFiltered(true);
          setClientRadius(radius);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor);
          setExtraProducts([]);
          locationRef.current = { lat, lng, radius };
        }
      } finally {
        setIsFetchingNearby(false);
      }
    },
    []
  );

  // Load more products (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || nextCursor === null) return;

    setIsFetchingMore(true);
    try {
      if (effectiveIsLocationFiltered && locationRef.current) {
        // Location mode: fetch more nearby posts
        const { lat, lng, radius } = locationRef.current;
        const result = await fetchNearbyListings({ lat, lng, radius, cursor: nextCursor });
        if (result.success) {
          setExtraProducts((prev) => [...prev, ...(result.data as unknown as InitialProductStateType[])]);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor);
        }
      } else {
        // Non-location mode: fetch more products
        const result = await fetchProductsPaginated(productType, nextCursor);
        if (result.success) {
          setExtraProducts((prev) => [...prev, ...result.data]);
          setHasMore(result.hasMore);
          setNextCursor(result.nextCursor);
        }
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetchingMore, hasMore, nextCursor, effectiveIsLocationFiltered, productType]);

  // Store location ref for server-rendered nearby case
  useEffect(() => {
    if (isLocationFiltered) {
      const lat = searchParams.get("lat");
      const lng = searchParams.get("lng");
      const radius = searchParams.get("radius");
      if (lat && lng) {
        locationRef.current = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          radius: radius ? parseInt(radius, 10) : DEFAULT_RADIUS_METERS,
        };
      }
    }
  }, [isLocationFiltered, searchParams]);

  // Auto-detect location on mount
  useEffect(() => {
    // Skip if URL already has location params (server already rendered nearby data)
    if (searchParams.has("lat") && searchParams.has("lng")) {
      return;
    }

    // If we have stored location, use it immediately via Server Action
    if (userLocation) {
      const radius = geoDistance || DEFAULT_RADIUS_METERS;

      // Update URL for shareability without triggering navigation
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("lat", userLocation.latitude.toFixed(6));
      newParams.set("lng", userLocation.longitude.toFixed(6));
      newParams.set("radius", radius.toString());
      window.history.replaceState({}, "", `?${newParams.toString()}`);

      fetchNearby(userLocation.latitude, userLocation.longitude, radius);
      return;
    }

    // Request browser geolocation
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const radius = geoDistance || DEFAULT_RADIUS_METERS;

          // Store in Zustand for future visits
          setUserLocation({ latitude, longitude });

          // Update URL for shareability without triggering navigation
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set("lat", latitude.toFixed(6));
          newParams.set("lng", longitude.toFixed(6));
          newParams.set("radius", radius.toString());
          window.history.replaceState({}, "", `?${newParams.toString()}`);

          // Fetch nearby posts via Server Action
          fetchNearby(latitude, longitude, radius);
        },
        (_error) => {
          // Silently fail - user will see all posts instead of nearby
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    }
  }, [searchParams, userLocation, setUserLocation, geoDistance, fetchNearby]);

  return (
    <>
      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={isFetchingNearby}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
      />
      {effectiveIsLocationFiltered && effectiveNearbyPosts && effectiveNearbyPosts.length === 0 && !isFetchingNearby && (
        <div className="text-center py-8 text-muted-foreground">
          Nothing shared within {formatDistance(effectiveRadius, locale)} yet — be the first to post in
          your area!
        </div>
      )}
    </>
  );
}

export default HomeClient;
