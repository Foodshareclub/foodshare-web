"use client";

import { EmptyListingState } from "@/components/emptyState/EmptyListingState";
import { LocationStatusBanner } from "@/components/location/LocationStatusBanner";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { ProductGrid } from "@/components/productCard/ProductGrid";
import { Button } from "@/components/ui/button";
import { useLocationResolver } from "@/hooks/useLocationResolver";
import { encodeNearbyCursor } from "@/lib/api/listing-cursor";
import type { NearbyCursor, NearbyPost } from "@/lib/data/nearby-posts";
import { type Coordinates, useUIStore } from "@/store/zustand/useUIStore";
import type { InitialProductStateType } from "@/types/product.types";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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

// ============================================================================
// Feed requests
//
// Both feeds are reads served by GET routes, not Server Actions. A read behind
// a POST is billed against the 30/minute mutation limiter in proxy.ts, which
// has no path filter, so scrolling the feed exhausted the same budget real
// writes share. `success: false` on failure is load-bearing: the client keeps
// the products it already has, whereas an empty `data` array would blank the
// feed.
// ============================================================================

interface NearbyListingsResponse {
  success: boolean;
  data: NearbyPost[];
  hasMore: boolean;
  nextCursor: string | null;
  radius: number;
  error?: string;
}

async function requestNearbyListings(params: {
  lat: number;
  lng: number;
  radius: number;
  postType: string;
  searchTerm?: string;
  cursor: string | null;
}): Promise<NearbyListingsResponse> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    radius: String(params.radius),
    type: params.postType,
  });
  if (params.searchTerm) query.set("q", params.searchTerm);
  if (params.cursor) query.set("cursor", params.cursor);

  try {
    const response = await fetch(`/api/listings/nearby?${query.toString()}`);
    if (!response.ok) {
      return { success: false, data: [], hasMore: false, nextCursor: null, radius: params.radius };
    }
    return (await response.json()) as NearbyListingsResponse;
  } catch {
    return { success: false, data: [], hasMore: false, nextCursor: null, radius: params.radius };
  }
}

interface ListingPageResponse {
  success: boolean;
  data: InitialProductStateType[];
  hasMore: boolean;
  nextCursor: number | null;
  error?: string;
}

async function requestListingPage(
  productType: string,
  cursor: number | null,
  searchTerm?: string,
): Promise<ListingPageResponse> {
  const query = new URLSearchParams({ type: productType });
  if (cursor !== null) query.set("cursor", String(cursor));
  if (searchTerm) query.set("q", searchTerm);

  try {
    const response = await fetch(`/api/listings?${query.toString()}`);
    if (!response.ok) {
      return { success: false, data: [], hasMore: false, nextCursor: null };
    }
    return (await response.json()) as ListingPageResponse;
  } catch {
    return { success: false, data: [], hasMore: false, nextCursor: null };
  }
}

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  initialLoadFailed?: boolean;
  searchTerm?: string;
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
  /** Initial user location resolved on server (from cookie or edge headers) */
  initialLocation?: Coordinates | null;
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
  initialLoadFailed = false,
  searchTerm = "",
  productType = "food",
  nearbyPosts,
  isLocationFiltered = false,
  radiusMeters = 5000,
  initialHasMore = false,
  initialNextCursor = null,
  initialLocation = null,
}: HomeClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const hasExplicitDistance = searchParams.get("distance") === "nearby";
  const locale = useLocale();

  // Get stored location from Zustand
  const userLocation = useUIStore((state) => state.userLocation);
  const geoDistance = useUIStore((state) => state.geoDistance);

  // Client-side nearby posts state (populated after geolocation detection)
  const [clientNearbyPosts, setClientNearbyPosts] = useState<NearbyPost[] | null>(null);
  const [isClientLocationFiltered, setIsClientLocationFiltered] = useState(false);
  // Track the *display* radius: the user's configured radius at first load.
  // Used only for the "Nothing shared within X" empty message, so it reflects
  // the genuine local radius, not the grown expansion radius.
  const [displayRadius, setDisplayRadius] = useState(radiusMeters);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);

  // Auto-resolve user location with permissions query and IP approximation fallback
  const {
    location: resolvedLocation,
    isApproximate,
    requestPreciseLocation,
  } = useLocationResolver({
    initialLocation: initialLocation || userLocation,
    autoResolve: !searchTerm && searchParams.get("distance") !== "any",
  });
  const [isUpgradingLocation, setIsUpgradingLocation] = useState(false);

  // Pagination state. Two disjoint cursor schemes coexist because the two fetch
  // paths are mutually exclusive per session:
  //   - nearbyCursor: keyset (distance, id) for location-mode
  //   - productsCursor: integer id for non-location mode
  // Only one is ever active depending on effectiveIsLocationFiltered.
  const [extraProducts, setExtraProducts] = useState<InitialProductStateType[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  // Held as the opaque wire form so a value can be handed straight back to
  // the route. The server-rendered cursor arrives as an object and is encoded
  // once, here, rather than keeping a union of "object from the server" and
  // "string from the client" and branching on which is which at every use.
  const [nearbyCursor, setNearbyCursor] = useState<string | null>(() =>
    encodeNearbyCursor(typeof initialNextCursor === "object" ? initialNextCursor : null),
  );
  const [productsCursor, setProductsCursor] = useState<number | null>(
    isLocationFiltered ? null : (initialNextCursor as unknown as number | null),
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [paginationFailed, setPaginationFailed] = useState(false);
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
          lat: Number.parseFloat(searchParams.get("lat") as string),
          lng: Number.parseFloat(searchParams.get("lng") as string),
          queryRadius: radiusMeters,
        }
      : initialLocation
        ? {
            lat: initialLocation.latitude,
            lng: initialLocation.longitude,
            queryRadius: radiusMeters,
          }
        : null,
  );

  // Use server-rendered nearby posts if available, otherwise use client-fetched ones
  const effectiveNearbyPosts = isLocationFiltered ? nearbyPosts : clientNearbyPosts;
  const effectiveIsLocationFiltered = isLocationFiltered || isClientLocationFiltered;
  const initialFetchFailed = initialLoadFailed && !isClientLocationFiltered;

  const baseProducts =
    effectiveIsLocationFiltered && effectiveNearbyPosts
      ? (effectiveNearbyPosts as unknown as InitialProductStateType[])
      : initialProducts;

  // Combine base products with extra pages loaded via infinite scroll
  const products = [...baseProducts, ...extraProducts];

  // Fetch nearby posts from the read route (no server re-render).
  //
  // This was a Server Action, and a read behind a POST spends one of the
  // 30/minute mutation-limiter calls in proxy.ts — a limiter with no path
  // filter, so it counted reads as writes. Infinite scroll in location mode
  // exhausted it within a few pages and the feed showed "Something went
  // wrong" instead of the next page. The same bucket is what real writes
  // share, so scrolling also rate-limited the user's next actual mutation.
  const fetchNearby = useCallback(async (lat: number, lng: number, radius: number, postType: string) => {
    setIsFetchingNearby(true);
    try {
      const result = await requestNearbyListings({ lat, lng, radius, postType, cursor: null });
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
  }, []);

  const effectiveHasMore = hasMore && !paginationFailed && !initialFetchFailed;

  /**
   * Append newly fetched nearby posts, deduping by id against everything
   * already shown (base + extras). Returns nothing; updates extraProducts.
   */
  const appendDeduped = useCallback(
    (incoming: NearbyPost[]) => {
      setExtraProducts((prev) => {
        const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
        const newProducts = (incoming as unknown as InitialProductStateType[]).filter((p) => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
    },
    [baseProducts],
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
    setPaginationFailed(false);

    // Location mode: keyset pagination with radius expansion on drain.
    if (effectiveIsLocationFiltered && locationRef.current) {
      const canPageCurrentTier = hasMore && nearbyCursor !== null;
      const atRadiusCap = locationRef.current.queryRadius >= MAX_RADIUS_METERS;
      if (!canPageCurrentTier && (atRadiusCap || hasExplicitDistance || !!searchTerm)) {
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
        // Same cursor either way: paging forward and widening the radius both
        // resume from the last row the client has seen, which is what keeps
        // the already-seen rows out of the wider query.
        const usingCursor = nearbyCursor;
        const radius = canPageCurrentTier ? queryRadius : nextRadiusStep(queryRadius);

        const result = await requestNearbyListings({
          lat,
          lng,
          radius,
          postType: productType,
          searchTerm,
          cursor: usingCursor,
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
          if (!result.hasMore && radius < MAX_RADIUS_METERS && !hasExplicitDistance && !searchTerm) {
            setHasMore(true);
          }
        } else {
          setPaginationFailed(true);
        }
      } catch {
        setPaginationFailed(true);
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
        const result = await requestListingPage(productType, productsCursor, searchTerm);
        if (result.success) {
          setExtraProducts((prev) => {
            const existingIds = new Set([...baseProducts, ...prev].map((p) => p.id));
            const newProducts = result.data.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newProducts];
          });
          setHasMore(result.hasMore);
          setProductsCursor(result.nextCursor);
        } else {
          setPaginationFailed(true);
        }
      } catch {
        setPaginationFailed(true);
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
    searchTerm,
    hasExplicitDistance,
    baseProducts,
    appendDeduped,
  ]);

  const handleUpgradeLocation = useCallback(async () => {
    setIsUpgradingLocation(true);
    try {
      const precise = await requestPreciseLocation();
      if (precise) {
        const radius = geoDistance || radiusMeters;
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("lat", precise.latitude.toFixed(6));
        newParams.set("lng", precise.longitude.toFixed(6));
        newParams.set("radius", radius.toString());
        window.history.replaceState({}, "", `?${newParams.toString()}`);
        fetchNearby(precise.latitude, precise.longitude, radius, productType);
      }
    } finally {
      setIsUpgradingLocation(false);
    }
  }, [fetchNearby, geoDistance, productType, radiusMeters, requestPreciseLocation, searchParams]);

  // Synchronize resolved location changes to the feed and URL
  useEffect(() => {
    if (searchTerm || searchParams.get("distance") === "any") return;
    if (!resolvedLocation) return;

    const radius = geoDistance || radiusMeters;
    const currentLat = locationRef.current?.lat;
    const currentLng = locationRef.current?.lng;

    const isSameLocation =
      currentLat !== undefined &&
      currentLng !== undefined &&
      Math.abs(currentLat - resolvedLocation.latitude) < 0.0001 &&
      Math.abs(currentLng - resolvedLocation.longitude) < 0.0001;

    // Update URL if searchParams is missing lat/lng
    if (!searchParams.has("lat") || !searchParams.has("lng")) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("lat", resolvedLocation.latitude.toFixed(6));
      newParams.set("lng", resolvedLocation.longitude.toFixed(6));
      newParams.set("radius", radius.toString());
      window.history.replaceState({}, "", `?${newParams.toString()}`);
    }

    // Skip refetching if already showing nearby posts for this location
    if (isSameLocation && effectiveIsLocationFiltered) {
      return;
    }

    const timer = setTimeout(() => {
      fetchNearby(resolvedLocation.latitude, resolvedLocation.longitude, radius, productType);
    }, 0);
    return () => clearTimeout(timer);
  }, [
    resolvedLocation,
    searchTerm,
    searchParams,
    geoDistance,
    radiusMeters,
    fetchNearby,
    productType,
    effectiveIsLocationFiltered,
  ]);

  const handleClearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("key_word");
    params.delete("q");
    const query = params.toString();
    router.push(query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [searchParams, router]);

  const isEmpty =
    !initialFetchFailed &&
    !paginationFailed &&
    products.length === 0 &&
    !isFetchingNearby &&
    !isFetchingMore &&
    !hasMore;

  return (
    <>
      <NavigateButtons title="Show map" />
      {effectiveIsLocationFiltered && isApproximate && (
        <LocationStatusBanner
          isApproximate={isApproximate}
          city={resolvedLocation?.city}
          onUpgradeLocation={handleUpgradeLocation}
          isUpgrading={isUpgradingLocation}
        />
      )}
      <ProductGrid
        products={products}
        isLoading={isFetchingNearby}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingMore}
        hasMore={effectiveHasMore}
      />
      {(initialFetchFailed || paginationFailed) && (
        <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8">
          <p className="text-muted-foreground">{t("something_went_wrong")}</p>
          <Button variant="outline" onClick={() => (initialFetchFailed ? router.refresh() : handleLoadMore())}>
            {t("try_again")}
          </Button>
        </div>
      )}
      {isEmpty && (
        <EmptyListingState
          productType={productType}
          searchTerm={searchTerm}
          isLocationFiltered={effectiveIsLocationFiltered}
          radiusMeters={displayRadius}
          locale={locale}
          onClearSearch={searchTerm ? handleClearSearch : undefined}
        />
      )}
    </>
  );
}

export default HomeClient;
