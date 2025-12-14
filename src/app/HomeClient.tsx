"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/productCard/ProductGrid";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { LocationFilter } from "@/components/location/LocationFilter";
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

/**
 * HomeClient - Client wrapper for the home page
 * Receives products from Server Component
 *
 * Location filtering works via URL searchParams:
 * - Client detects location and updates URL with lat/lng/radius
 * - Server Component fetches nearby posts based on searchParams
 * - This follows server-first architecture (no useEffect data fetching)
 */
export function HomeClient({
  initialProducts,
  productType: _productType = "food",
  nearbyPosts,
  isLocationFiltered = false,
  radiusMeters = 5000,
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Use nearby posts if location filter is active, otherwise use initial products
  // NearbyPost has all fields needed by ProductCard, so cast is safe
  const products =
    isLocationFiltered && nearbyPosts
      ? (nearbyPosts as unknown as InitialProductStateType[])
      : initialProducts;

  // Handle load more - triggers server-side fetch
  const handleLoadMore = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Handle location filter change - updates URL searchParams
  const handleLocationChange = (
    params: {
      latitude: number;
      longitude: number;
      radiusMeters: number;
    } | null
  ) => {
    const newParams = new URLSearchParams(searchParams.toString());

    if (params) {
      // Add location params to URL
      newParams.set("lat", params.latitude.toFixed(6));
      newParams.set("lng", params.longitude.toFixed(6));
      newParams.set("radius", params.radiusMeters.toString());
    } else {
      // Remove location params
      newParams.delete("lat");
      newParams.delete("lng");
      newParams.delete("radius");
    }

    // Navigate with new params (triggers server-side data fetch)
    startTransition(() => {
      router.push(`?${newParams.toString()}`);
    });
  };

  return (
    <>
      <NavigateButtons title="Show map">
        <LocationFilter onLocationChange={handleLocationChange} />
      </NavigateButtons>
      <ProductGrid
        products={products}
        isLoading={isPending}
        onLoadMore={handleLoadMore}
        isFetchingMore={isPending}
        hasMore={false}
      />
      {isLocationFiltered && nearbyPosts && nearbyPosts.length === 0 && !isPending && (
        <div className="text-center py-8 text-muted-foreground">
          No posts found within {Math.round(radiusMeters / 1000)} km. Try increasing the search
          radius.
        </div>
      )}
    </>
  );
}

export default HomeClient;
