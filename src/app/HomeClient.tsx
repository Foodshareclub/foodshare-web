"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/productCard/ProductGrid";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { useUIStore } from "@/store/zustand/useUIStore";
import type { InitialProductStateType } from "@/types/product.types";
import type { NearbyPost } from "@/lib/data/nearby-posts";

interface HomeClientProps {
  initialProducts: InitialProductStateType[];
  productType?: string;
  /** Nearby posts with distance (when location filter is active) */
  nearbyPosts?: NearbyPost[] | null;
  /** Whether location filter is currently active */
  isLocationFiltered?: boolean;
  /** Current radius in meters */
  radiusMeters?: number;
}

// Default search radius in meters (5km)
const DEFAULT_RADIUS_METERS = 5000;

/**
 * HomeClient - Client wrapper for the home page
 * Automatically detects user location and shows nearby posts
 *
 * Flow:
 * 1. On mount, check if URL already has location params
 * 2. If not, request browser geolocation automatically
 * 3. Once location is obtained, update URL with lat/lng/radius
 * 4. Server Component re-renders with nearby posts
 */
export function HomeClient({
  initialProducts,
  productType: _productType = "food",
  nearbyPosts,
  isLocationFiltered = false,
  radiusMeters = DEFAULT_RADIUS_METERS,
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get stored location from Zustand (persisted across sessions)
  const userLocation = useUIStore((state) => state.userLocation);
  const setUserLocation = useUIStore((state) => state.setUserLocation);
  const geoDistance = useUIStore((state) => state.geoDistance);

  // Use nearby posts if location filter is active, otherwise use initial products
  const products =
    isLocationFiltered && nearbyPosts
      ? (nearbyPosts as unknown as InitialProductStateType[])
      : initialProducts;

  // Auto-detect location on mount
  useEffect(() => {
    // Skip if URL already has location params
    if (searchParams.has("lat") && searchParams.has("lng")) {
      return;
    }

    // If we have stored location, use it immediately
    if (userLocation) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("lat", userLocation.latitude.toFixed(6));
      newParams.set("lng", userLocation.longitude.toFixed(6));
      newParams.set("radius", (geoDistance || DEFAULT_RADIUS_METERS).toString());

      startTransition(() => {
        router.replace(`?${newParams.toString()}`);
      });
      return;
    }

    // Request browser geolocation
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Store in Zustand for future visits
          setUserLocation({ latitude, longitude });

          // Update URL to trigger server-side fetch
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.set("lat", latitude.toFixed(6));
          newParams.set("lng", longitude.toFixed(6));
          newParams.set("radius", (geoDistance || DEFAULT_RADIUS_METERS).toString());

          startTransition(() => {
            router.replace(`?${newParams.toString()}`);
          });
        },
        (_error) => {
          // Silently fail - user will see all posts instead of nearby
          // This is fine for users who deny location permission
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    }
  }, [searchParams, userLocation, setUserLocation, geoDistance, router]);

  // Handle load more - triggers server-side fetch
  const handleLoadMore = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <>
      <NavigateButtons title="Show map" />
      <ProductGrid
        products={products}
        isLoading={isPending}
        onLoadMore={handleLoadMore}
        isFetchingMore={isPending}
        hasMore={false}
      />
      {isLocationFiltered && nearbyPosts && nearbyPosts.length === 0 && !isPending && (
        <div className="text-center py-8 text-muted-foreground">
          No posts found within {Math.round(radiusMeters / 1000)} km of your location.
        </div>
      )}
    </>
  );
}

export default HomeClient;
