"use client";

/**
 * Map Client Component - Handles all Leaflet map rendering
 * Receives pre-fetched locations and user data from Server Component
 */

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import "@/components/leaflet/leaflet.css";

import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import Navbar from "@/components/header/navbar/Navbar";
import { useCustomMarkerIcon, useUserLocationIcon, createClusterIcon } from "@/hooks/useMarkerIcon";
import { useDefaultMapCenter } from "@/hooks/useDefaultMapCenter";
import { useWebGLRenderer } from "@/hooks/useWebGLRenderer";
import { useMapZoom } from "@/hooks/useMapZoom";
import { useMapPosition } from "@/hooks/useMapPosition";
import { getCoordinates, type LocationType } from "@/types/product.types";
import type { AuthUser } from "@/lib/data/auth";

// Dynamic imports for Leaflet components (SSR: false is critical!)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});

const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), {
  ssr: false,
});

// Import other map components dynamically
const MapViewController = dynamic(
  () => import("@/components/leaflet/MapViewController").then((mod) => ({ default: mod.default })),
  { ssr: false }
);

const ZoomTracker = dynamic(
  () => import("@/components/leaflet/ZoomTracker").then((mod) => ({ default: mod.default })),
  { ssr: false }
);

const MapPositionTracker = dynamic(
  () => import("@/components/leaflet/MapPositionTracker").then((mod) => ({ default: mod.default })),
  { ssr: false }
);

const SearchMenu = dynamic(
  () => import("@/components/leaflet/SearchMenu").then((mod) => ({ default: mod.SearchMenu })),
  { ssr: false }
);

const UserLocationMarker = dynamic(() => import("@/components/leaflet/UserLocationMarker"), {
  ssr: false,
});

const ProductPopup = dynamic(
  () => import("@/components/map/ProductPopup").then((mod) => ({ default: mod.ProductPopup })),
  { ssr: false }
);

const ViewportLoader = dynamic(
  () => import("@/components/leaflet/ViewportLoader"),
  { ssr: false }
);

interface MapClientProps {
  type: string;
  initialLocations: LocationType[];
  user: AuthUser | null;
}

export function MapClient({ type, initialLocations, user }: MapClientProps) {
  const router = useRouter();

  // State to track if component is mounted (for SSR safety)
  const [mounted, setMounted] = useState(false);

  // Locations state - initialized with server data, updated by ViewportLoader
  const [locations, setLocations] = useState<LocationType[]>(initialLocations);

  // Viewport-based loading callback
  const handleLocationsLoaded = useCallback((newLocations: LocationType[]) => {
    setLocations(newLocations);
  }, []);

  // Auth state from user prop
  const isAuth = !!user;
  const userId = user?.id || "";
  const profile = user?.profile;

  // Navbar handlers
  const handleRouteChange = useCallback(
    (route: string) => {
      router.push(`/map/${route}`);
    },
    [router]
  );

  const handleProductTypeChange = useCallback(
    (newType: string) => {
      // Navigate to new map type - Server Component will refetch
      router.push(`/map/${newType}`);
    },
    [router]
  );

  // Custom marker icons
  const beautifulMarker = useCustomMarkerIcon();
  const userMarker = useUserLocationIcon();

  // WebGL-accelerated renderer for ultra-fast marker rendering
  const webglRenderer = useWebGLRenderer({ padding: 0.5, tolerance: 0 });

  // Dynamic map center based on user's location/timezone/locale
  const {
    center: dynamicCenter,
    isLoading: isCenterLoading,
    isUserLocation,
  } = useDefaultMapCenter();

  // Map position persistence - remembers where user was on each category
  const { savedPosition, savePosition, hasSavedPosition } = useMapPosition({
    category: type,
    defaultCenter: dynamicCenter,
    defaultZoom: 13,
  });

  // Update locations when initialLocations changes (route change)
  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  // Set mounted state for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map center priority: Saved position > User's ACTUAL location > Nearby products > Timezone/Locale fallback
  const hasLocations = locations.length > 0;

  // Helper to get coordinates from first location
  const getFirstLocationCoords = () => {
    if (!hasLocations || !locations[0]) return null;
    const coords = getCoordinates(locations[0]);
    return coords ? ([coords.lat, coords.lng] as [number, number]) : null;
  };

  const mapCenter: [number, number] =
    hasSavedPosition && savedPosition
      ? savedPosition.center // User's last position for this category
      : isUserLocation
        ? dynamicCenter // User's real location if we have it
        : getFirstLocationCoords() || dynamicCenter; // Fallback to timezone/locale-based location

  // Smart zoom management with caching and best practices
  const { zoom: mapZoom, updateZoom } = useMapZoom({
    isUserLocation: isUserLocation && !hasSavedPosition, // Don't auto-zoom if we have saved position
    hasProducts: hasLocations,
    productCount: locations.length,
  });

  // Use saved zoom if available, otherwise use smart zoom
  const finalZoom = hasSavedPosition && savedPosition ? savedPosition.zoom : mapZoom;

  // Don't render map until mounted (SSR safety)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Navbar
          userId={userId}
          isAuth={isAuth}
          productType={type}
          onRouteChange={handleRouteChange}
          onProductTypeChange={handleProductTypeChange}
          imgUrl={profile?.avatar_url || ""}
          firstName={profile?.first_name || ""}
          secondName={profile?.second_name || ""}
          email={profile?.email || ""}
          signalOfNewMessage={[]}
          mapMode={true}
        />
        <div className="relative h-map w-full isolate">
          <NavigateButtons navigateTo={type} title={"Show posts"} />
          <div className="h-full w-full animate-pulse bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar
        userId={userId}
        isAuth={isAuth}
        productType={type}
        onRouteChange={handleRouteChange}
        onProductTypeChange={handleProductTypeChange}
        imgUrl={profile?.avatar_url || ""}
        firstName={profile?.first_name || ""}
        secondName={profile?.second_name || ""}
        email={profile?.email || ""}
        signalOfNewMessage={[]}
        mapMode={true}
      />
      <div className="relative h-map w-full isolate contain-layout contain-style contain-paint">
        <NavigateButtons navigateTo={type} title={"Show posts"} />
        {/* Show loading skeleton while determining map center */}
        {isCenterLoading ? (
          <div className="h-full w-full animate-pulse bg-muted flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <p className="text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            style={{
              height: "100%",
              width: "100%",
              zIndex: 0,
              transform: "translate3d(0, 0, 0)",
              willChange: "transform",
            }}
            center={mapCenter}
            zoom={finalZoom}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={false}
            zoomAnimation={true}
            fadeAnimation={true}
            markerZoomAnimation={true}
            renderer={webglRenderer} // WebGL-accelerated rendering
          >
            {/* Dynamic view controller - updates center/zoom ONCE on initial load */}
            <MapViewController
              center={mapCenter}
              zoom={finalZoom}
              isUserLocation={isUserLocation && !hasSavedPosition}
            />

            {/* Track user zoom changes and cache preferences */}
            <ZoomTracker onZoomChange={updateZoom} />

            {/* Track map position changes and save for next visit */}
            <MapPositionTracker category={type} onPositionChange={savePosition} />

            <SearchMenu />

            {/* Viewport-based location loading - fetches markers as user pans/zooms */}
            <ViewportLoader
              productType={type}
              onLocationsLoaded={handleLocationsLoaded}
            />

            {/* Beautiful CartoDB Voyager tiles with GPU acceleration */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={20}
              minZoom={2}
              tileSize={256}
              updateWhenIdle={true}
              updateWhenZooming={false}
              keepBuffer={4}
              maxNativeZoom={18}
              crossOrigin={true}
              className="gpu-accelerated-tiles"
            />

            <UserLocationMarker icon={userMarker} />

            {hasLocations ? (
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={100}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                animate={true}
                animateAddingMarkers={true}
                removeOutsideVisibleBounds={true} // Viewport culling
                iconCreateFunction={(cluster: { getChildCount: () => number }) => {
                  return createClusterIcon(cluster.getChildCount());
                }}
              >
                {locations
                  .map((item, index) => {
                    const coords = getCoordinates(item);
                    if (!coords) return null;

                    return (
                      <Marker
                        icon={beautifulMarker}
                        key={`marker-${item.id}-${index}`}
                        position={[coords.lat, coords.lng]}
                      >
                        <Popup
                          className="custom-popup product-card-popup"
                          closeButton={true}
                          maxWidth={280}
                        >
                          <ProductPopup
                            id={item.id}
                            productType={type}
                            name={item.post_name}
                            type={item.post_type}
                            image={(item as LocationType & { images?: string[] }).images?.[0]}
                          />
                        </Popup>
                      </Marker>
                    );
                  })
                  .filter(Boolean)}
              </MarkerClusterGroup>
            ) : null}
          </MapContainer>
        )}

        {/* Empty state overlay */}
        {!hasLocations && !isCenterLoading && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none">
            <div
              className="bg-white p-8 rounded-2xl flex flex-col gap-3"
              style={{ boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)" }}
            >
              <span className="text-5xl text-center">🗺️</span>
              <p className="text-xl font-semibold text-gray-700">No items found</p>
              <p className="text-sm text-gray-500 text-center max-w-[300px]">
                There are currently no {type} items with location data in this area
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapClient;
