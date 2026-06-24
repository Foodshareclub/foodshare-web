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

// Default search radius in meters (passed as prop, falls back to 5km if not provided)

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
  radiusMeters = 5000,
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
    async (lat: number, lng: number, radius: number, postType: string) => {
      setIsFetchingNearby(true);
      try {
        const result = await fetchNearbyListings({ lat, lng, radius, postType });
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

  // Helper to determine the next radius tier for progressive expansion
  const getNextRadius = (currentRadius: number) => {
    if (currentRadius < 15000) return 15000;
    if (currentRadius < 30000) return 30000;
    if (currentRadius < 50000) return 50000;
    return null; // Stop expanding at 50km
  };

  const canExpandRadius = Boolean(
    effectiveIsLocationFiltered &&
    locationRef.current &&
    getNextRadius(locationRef.current.radius) !== null
  );
  const effectiveHasMore = hasMore || canExpandRadius;

  // Load more products (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore) return;

    // Normal pagination case
    if (hasMore && nextCursor !== null) {
      setIsFetchingMore(true);
      try {
        if (effectiveIsLocationFiltered && locationRef.current) {
          // Location mode: fetch more nearby posts
          const { lat, lng, radius } = locationRef.current;
          const result = await fetchNearbyListings({
            lat,
            lng,
            radius,
            postType: productType,
            cursor: nextCursor,
          });
          if (result.success) {
            setExtraProducts((prev) => {
              const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
              const newProducts = (result.data as unknown as InitialProductStateType[]).filter(
                (p) => !existingIds.has(p.id)
              );
              return [...prev, ...newProducts];
            });
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
          }
        } else {
          // Non-location mode: fetch more products
          const result = await fetchProductsPaginated(productType, nextCursor);
          if (result.success) {
            setExtraProducts((prev) => {
              const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
              const newProducts = result.data.filter((p) => !existingIds.has(p.id));
              return [...prev, ...newProducts];
            });
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
          }
        }
      } finally {
        setIsFetchingMore(false);
      }
      return;
    }

    // Radius expansion case
    if (!hasMore && canExpandRadius && locationRef.current) {
      setIsFetchingMore(true);
      try {
        const { lat, lng, radius } = locationRef.current;
        const nextRadius = getNextRadius(radius);

        if (nextRadius !== null) {
          // Fetch from the beginning of the new radius
          const result = await fetchNearbyListings({
            lat,
            lng,
            radius: nextRadius,
            postType: productType,
            cursor: null,
          });
          if (result.success) {
            // Update current location ref to the new radius
            locationRef.current.radius = nextRadius;
            setClientRadius(nextRadius);

            setExtraProducts((prev) => {
              const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
              const newProducts = (result.data as unknown as InitialProductStateType[]).filter(
                (p) => !existingIds.has(p.id)
              );
              return [...prev, ...newProducts];
            });
            setHasMore(result.hasMore);
            setNextCursor(result.nextCursor);
          }
        }
      } finally {
        setIsFetchingMore(false);
      }
    }
  }, [
    isFetchingMore,
    hasMore,
    nextCursor,
    effectiveIsLocationFiltered,
    productType,
    canExpandRadius,
    baseProducts,
  ]);

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
          radius: radius ? parseInt(radius, 10) : radiusMeters,
        };
      }
    }
  }, [isLocationFiltered, searchParams, radiusMeters]);

  // Auto-detect location on mount
  useEffect(() => {
    // Skip if URL already has location params (server already rendered nearby data)
    if (searchParams.has("lat") && searchParams.has("lng")) {
      return;
    }

    // If we have stored location, use it immediately via Server Action
    if (userLocation) {
      const radius = geoDistance || radiusMeters;

      // Update URL for shareability without triggering navigation
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("lat", userLocation.latitude.toFixed(6));
      newParams.set("lng", userLocation.longitude.toFixed(6));
      newParams.set("radius", radius.toString());
      window.history.replaceState({}, "", `?${newParams.toString()}`);

      fetchNearby(userLocation.latitude, userLocation.longitude, radius, productType);
      return;
    }

    // Request browser geolocation
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const radius = geoDistance || radiusMeters;

          // Store in Zustand for future visits
          setUserLocation({ latitude, longitude });

          // Update URL for shareability without triggering navigation
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set("lat", latitude.toFixed(6));
          newParams.set("lng", longitude.toFixed(6));
          newParams.set("radius", radius.toString());
          window.history.replaceState({}, "", `?${newParams.toString()}`);

          // Fetch nearby posts via Server Action
          fetchNearby(latitude, longitude, radius, productType);
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
  }, [
    searchParams,
    userLocation,
    setUserLocation,
    geoDistance,
    fetchNearby,
    productType,
    radiusMeters,
  ]);

  return (
    <>
      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={isFetchingNearby}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingMore}
        hasMore={effectiveHasMore}
      />
      {effectiveIsLocationFiltered &&
        effectiveNearbyPosts &&
        effectiveNearbyPosts.length === 0 &&
        !isFetchingNearby && (
          <div className="text-center py-8 text-muted-foreground">
            Nothing shared within {formatDistance(effectiveRadius, locale)} yet — be the first to
            post in your area!
          </div>
        )}
    </>
  );
}

export default HomeClient;
