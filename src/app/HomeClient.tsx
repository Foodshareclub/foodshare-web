"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { ProductGrid } from "@/components/productCard/ProductGrid";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { useUIStore } from "@/store/zustand/useUIStore";
import { fetchNearbyListings, fetchProductsPaginated } from "@/app/actions/nearby-listings";
import type { InitialProductStateType } from "@/types/product.types";
import type { NearbyCursor, NearbyPost } from "@/lib/data/nearby-posts";

/** Hard cap on radius expansion. Beyond this the feed is considered exhausted. */
const MAX_RADIUS_METERS = 50000; // 50km

/** Format distance for display - miles for US (en), km for others */
function formatDistance(meters: number, locale: string): string {
  if (locale === "en") {
    const miles = meters / 1609.34;
    return `${Math.round(miles)} miles`;
  }
  const km = meters / 1000;
  return `${Math.round(km)} km`;
}

/**
 * Next radius step during expansion. Doubles each time, capped at MAX_RADIUS.
 * 5km → 10km → 20km → 40km → 50km → done.
 */
function nextRadiusStep(currentRadius: number): number {
  return Math.min(currentRadius * 2, MAX_RADIUS_METERS);
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
  /** Keyset cursor for next page (from server) */
  initialNextCursor?: NearbyCursor | number | null;
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
  // Track the *display* radius: the user's configured radius at first load.
  // Used only for the "Nothing shared within X" empty message, so it reflects
  // the genuine local radius, not the grown expansion radius.
  const [displayRadius, setDisplayRadius] = useState(radiusMeters);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);

  // Pagination state. Two disjoint cursor schemes coexist because the two fetch
  // paths are mutually exclusive per session:
  //   - nearbyCursor: keyset (distance, id) for location-mode
  //   - productsCursor: integer id for non-location mode
  // Only one is ever active depending on effectiveIsLocationFiltered.
  const [extraProducts, setExtraProducts] = useState<InitialProductStateType[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nearbyCursor, setNearbyCursor] = useState<NearbyCursor | number | null>(
    initialNextCursor ?? null
  );
  const [productsCursor, setProductsCursor] = useState<number | null>(
    isLocationFiltered ? null : (initialNextCursor as unknown as number | null)
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // True once at least one load-more has fired. Gates the "Nothing shared"
  // message to initial load only, so it never reflects the expansion radius.
  const [_hasAttemptedLoadMore, setHasAttemptedLoadMore] = useState(false);

  // Track location + the *currently-active query radius* for nearby fetching.
  // queryRadius grows during expansion; displayRadius (state) stays at the user's
  // configured value for messaging. Keeping queryRadius in a ref avoids stale
  // closures inside handleLoadMore without adding it to the dependency array
  // on every render.
  const locationRef = useRef<{ lat: number; lng: number; queryRadius: number } | null>(
    isLocationFiltered && searchParams.has("lat") && searchParams.has("lng")
      ? {
          lat: parseFloat(searchParams.get("lat") as string),
          lng: parseFloat(searchParams.get("lng") as string),
          queryRadius: searchParams.has("radius")
            ? parseInt(searchParams.get("radius") as string, 10)
            : radiusMeters,
        }
      : null
  );

  // Use server-rendered nearby posts if available, otherwise use client-fetched ones
  const effectiveNearbyPosts = isLocationFiltered ? nearbyPosts : clientNearbyPosts;
  const effectiveIsLocationFiltered = isLocationFiltered || isClientLocationFiltered;

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
          // displayRadius captures the user's configured radius at first load.
          setDisplayRadius(radius);
          setHasMore(result.hasMore);
          setNearbyCursor(result.nextCursor);
          setProductsCursor(null);
          setExtraProducts([]);
          setHasAttemptedLoadMore(false);
          locationRef.current = { lat, lng, queryRadius: radius };
        }
      } finally {
        setIsFetchingNearby(false);
      }
    },
    []
  );

  const effectiveHasMore = hasMore;

  /**
   * Append newly fetched nearby posts, deduping by id against everything
   * already shown (base + extras). Returns nothing; updates extraProducts.
   */
  const appendDeduped = useCallback(
    (incoming: NearbyPost[]) => {
      setExtraProducts((prev) => {
        const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
        const newProducts = (incoming as unknown as InitialProductStateType[]).filter(
          (p) => !existingIds.has(p.id)
        );
        return [...prev, ...newProducts];
      });
    },
    [baseProducts]
  );

  /**
   * Load more products (infinite scroll).
   *
   * Location mode uses keyset pagination over (distance_meters, id). When a
   * radius tier is exhausted (hasMore=false) we EXPAND the search radius
   * (doubling, capped at 50km) and re-query with the SAME keyset cursor.
   * Because the keyset predicate excludes every already-seen row regardless of
   * radius, expansion can only add farther items — no dupes, no skips, and the
   * ORDER BY stays globally consistent.
   */
  const handleLoadMore = useCallback(async () => {
    if (isFetchingMore) return;

    // Location mode: keyset pagination with radius expansion on drain.
    if (effectiveIsLocationFiltered && locationRef.current) {
      const canPageCurrentTier = hasMore && nearbyCursor !== null;
      const atRadiusCap = locationRef.current.queryRadius >= MAX_RADIUS_METERS;
      if (!canPageCurrentTier && atRadiusCap) {
        // Exhausted at max radius — feed is genuinely done.
        setHasMore(false);
        return;
      }

      setIsFetchingMore(true);
      setHasAttemptedLoadMore(true);
      try {
        const { lat, lng, queryRadius } = locationRef.current;
        // Within the current tier: page forward with the cursor.
        // Tier drained: widen the radius and re-query from the SAME cursor —
        // the keyset predicate excludes all already-seen rows, so a wider net
        // can only surface farther items (no dupes, no skips).
        const usingCursor = canPageCurrentTier ? nearbyCursor : nearbyCursor;
        const radius = canPageCurrentTier ? queryRadius : nextRadiusStep(queryRadius);

        const result = await fetchNearbyListings({
          lat,
          lng,
          radius,
          postType: productType,
          cursor: usingCursor as NearbyCursor | null,
        });

        if (result.success) {
          if (result.data.length > 0) {
            appendDeduped(result.data);
          }
          locationRef.current = { lat, lng, queryRadius: radius };
          setHasMore(result.hasMore);
          setNearbyCursor(result.nextCursor);

          // Tier drained but a larger radius remains: keep infinite scroll
          // armed so the next trigger expands the net again.
          if (!result.hasMore && radius < MAX_RADIUS_METERS) {
            setHasMore(true);
          }
        }
      } finally {
        setIsFetchingMore(false);
      }
      return;
    }

    // Non-location mode: id-based keyset pagination (separate cursor scheme).
    if (hasMore && productsCursor !== null) {
      setIsFetchingMore(true);
      setHasAttemptedLoadMore(true);
      try {
        const result = await fetchProductsPaginated(productType, productsCursor);
        if (result.success) {
          setExtraProducts((prev) => {
            const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
            const newProducts = result.data.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newProducts];
          });
          setHasMore(result.hasMore);
          setProductsCursor(result.nextCursor);
        }
      } finally {
        setIsFetchingMore(false);
      }
    }
  }, [
    isFetchingMore,
    hasMore,
    nearbyCursor,
    productsCursor,
    effectiveIsLocationFiltered,
    productType,
    appendDeduped,
  ]);

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

      setTimeout(() => {
        fetchNearby(userLocation.latitude, userLocation.longitude, radius, productType);
      }, 0);
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
            Nothing shared within {formatDistance(displayRadius, locale)} yet — be the first to post
            in your area!
          </div>
        )}
    </>
  );
}

export default HomeClient;
