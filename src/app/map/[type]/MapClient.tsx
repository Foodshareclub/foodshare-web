"use client";

/**
 * Map Client Component - Handles full-viewport interactive Leaflet map rendering.
 * Receives pre-fetched locations and user data from Server Component.
 */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "@/components/leaflet/leaflet.css";

import Navbar from "@/components/header/navbar/Navbar";
import { MapPreviewCard } from "@/components/map/MapListingCard";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { useDefaultMapCenter } from "@/hooks/useDefaultMapCenter";
import { useMapPosition } from "@/hooks/useMapPosition";
import { useMapZoom } from "@/hooks/useMapZoom";
import { createClusterIcon, createPillMarkerIcon, useUserLocationIcon } from "@/hooks/useMarkerIcon";
import { useWebGLRenderer } from "@/hooks/useWebGLRenderer";
import { MAP_CONFIG } from "@/lib/config";
import type { AuthUser } from "@/lib/data/auth";
import { type LocationType, getCoordinates } from "@/types/product.types";

// Dynamic imports for Leaflet components (SSR: false is critical!)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});

const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });

const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), {
  ssr: false,
});

// Import other map components dynamically
const MapViewController = dynamic(
  () => import("@/components/leaflet/MapViewController").then((mod) => ({ default: mod.default })),
  { ssr: false },
);

const ZoomTracker = dynamic(
  () => import("@/components/leaflet/ZoomTracker").then((mod) => ({ default: mod.default })),
  { ssr: false },
);

const MapPositionTracker = dynamic(
  () => import("@/components/leaflet/MapPositionTracker").then((mod) => ({ default: mod.default })),
  { ssr: false },
);

const SearchMenu = dynamic(
  () => import("@/components/leaflet/SearchMenu").then((mod) => ({ default: mod.SearchMenu })),
  { ssr: false },
);

const UserLocationMarker = dynamic(() => import("@/components/leaflet/UserLocationMarker"), {
  ssr: false,
});

const ViewportLoader = dynamic(() => import("@/components/leaflet/ViewportLoader"), { ssr: false });

interface MapClientProps {
  type: string;
  initialLocations: LocationType[];
  user: AuthUser | null;
}

export function MapClient({ type, initialLocations, user }: MapClientProps) {
  const router = useRouter();

  // State to track if component is mounted (for SSR safety)
  const [mounted, setMounted] = useState(false);
  // Generate unique map container key per mount and category to prevent React DOM node reuse
  const [mapKey, setMapKey] = useState(() => `map-${type}-${Date.now()}`);

  useEffect(() => {
    setMapKey(`map-${type}-${Date.now()}`);
  }, [type]);

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
    [router],
  );

  const handleProductTypeChange = useCallback(
    (newType: string) => {
      // Navigate to new map type - Server Component will refetch
      router.push(`/map/${newType}`);
    },
    [router],
  );

  // Selection state shared between markers and floating preview card
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedItem = locations.find((item) => item.id === selectedId) ?? null;

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  // Custom marker icons
  const userMarker = useUserLocationIcon();

  // WebGL-accelerated renderer for ultra-fast marker rendering
  const webglRenderer = useWebGLRenderer({ padding: 0.5, tolerance: 0 });

  // Dynamic map center based on user's location/timezone/locale
  const { center: dynamicCenter, isLoading: isCenterLoading, isUserLocation } = useDefaultMapCenter();

  // Map position persistence - remembers where user was on each category
  const { savedPosition, savePosition, hasSavedPosition } = useMapPosition({
    category: type,
    defaultCenter: dynamicCenter,
    defaultZoom: 13,
  });

  // Update locations when initialLocations changes (route change)
  useEffect(() => {
    setTimeout(() => {
      setLocations(initialLocations);
    }, 0);
  }, [initialLocations]);

  // Set mounted state for SSR safety and ensure container clean slate
  useEffect(() => {
    setMounted(true);
    return () => {
      // Clear any dangling _leaflet_id on unmount to avoid "Map container is being reused" on soft reload
      const containers = document.querySelectorAll(".leaflet-container");
      containers.forEach((el) => {
        delete (el as unknown as { _leaflet_id?: number })._leaflet_id;
      });
    };
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
      <div data-map-page className="flex h-full w-full flex-col overflow-hidden bg-background">
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
        <div className="relative flex-1 min-h-0 w-full isolate">
          <div className="absolute inset-0 animate-pulse bg-muted flex items-center justify-center">
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
    <div data-map-page className="flex h-full w-full flex-col overflow-hidden bg-background">
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
      <div className="relative flex-1 min-h-0 w-full isolate contain-layout contain-style contain-paint">
        <div className="absolute inset-0">
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
              key={mapKey}
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
              <ViewportLoader productType={type} onLocationsLoaded={handleLocationsLoaded} />

              {/* Map Tiles (OSM by default, CARTO Voyager when API key is provided) */}
              <TileLayer
                url={MAP_CONFIG.tileUrl}
                attribution={MAP_CONFIG.tileAttribution}
                maxZoom={19}
                minZoom={2}
                tileSize={256}
                updateWhenIdle={true}
                updateWhenZooming={false}
                keepBuffer={4}
                maxNativeZoom={19}
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

                      const state = item.id === selectedId ? "selected" : "default";
                      return (
                        <Marker
                          icon={createPillMarkerIcon(item.post_name, state)}
                          key={`marker-${item.id}-${index}`}
                          position={[coords.lat, coords.lng]}
                          title={item.post_name}
                          zIndexOffset={state === "default" ? 0 : 1000}
                          // Marker hover is CSS-only: swapping the icon on mouseover replaces
                          // its element and swallows the click.
                          eventHandlers={{ click: () => handleSelect(item.id) }}
                        />
                      );
                    })
                    .filter(Boolean)}
                </MarkerClusterGroup>
              ) : null}
            </MapContainer>
          )}
        </div>

        {/* Empty state overlay */}
        {!hasLocations && !isCenterLoading && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-8 shadow-lg">
              <span className="text-center text-5xl" aria-hidden="true">
                🗺
              </span>
              <p className="text-xl font-semibold text-foreground">No items found</p>
              <p className="max-w-[300px] text-center text-sm text-muted-foreground">
                There are currently no {type} items with location data in this area
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected-marker floating preview card */}
      {selectedItem && (
        <div className="fixed inset-x-4 bottom-[calc(max(1.5rem,env(safe-area-inset-bottom))+4.5rem)] z-40 sm:inset-x-auto sm:start-6 sm:bottom-8 sm:w-96">
          <MapPreviewCard item={selectedItem} productType={type} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Floating pill back to listings grid */}
      <NavigateButtons navigateTo={type} title="Show listings" />
    </div>
  );
}

export default MapClient;
