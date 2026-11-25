"use client";

/**
 * Map Client Component - Handles full-viewport interactive Leaflet map rendering.
 * Receives pre-fetched locations and user location from Server Component,
 * then dynamically loads markers on pan/zoom via ViewportLoader.
 */

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "@/components/leaflet/leaflet.css";

import Navbar from "@/components/header/navbar/Navbar";
import { MapPreviewCard } from "@/components/map/MapListingCard";
import NavigateButtons from "@/components/navigateButtons/NavigateButtons";
import { Button } from "@/components/ui/button";
import { useDefaultMapCenter } from "@/hooks/useDefaultMapCenter";
import { useMapPosition } from "@/hooks/useMapPosition";
import { useMapZoom } from "@/hooks/useMapZoom";
import { createClusterIcon, createPillMarkerIcon, useUserLocationIcon } from "@/hooks/useMarkerIcon";
import { useWebGLRenderer } from "@/hooks/useWebGLRenderer";
import { MAP_CONFIG } from "@/lib/config";
import type { AuthUser } from "@/lib/data/auth";
import type { Coordinates as StoreCoordinates } from "@/store/zustand/useUIStore";
import { type LocationType, getCoordinates } from "@/types/product.types";
import type L from "leaflet";
import { Loader2, RefreshCw, ZoomOut } from "lucide-react";

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

const MapRefBinder = dynamic(
  () =>
    import("react-leaflet").then(({ useMap }) => ({
      default: function MapRefBinder({ onReady }: { onReady: (map: L.Map) => void }) {
        const map = useMap();
        useEffect(() => {
          onReady(map);
        }, [map, onReady]);
        return null;
      },
    })),
  { ssr: false },
);

interface MapClientProps {
  type: string;
  initialLocations: LocationType[];
  initialLocation?: StoreCoordinates | null;
  user: AuthUser | null;
}

export function MapClient({ type, initialLocations, initialLocation = null, user }: MapClientProps) {
  const router = useRouter();

  // State to track if component is mounted (for SSR safety)
  const [mounted, setMounted] = useState(false);
  // Generate unique map container key per mount and category to prevent React DOM node reuse
  const [mapKey, setMapKey] = useState(() => `map-${type}-${Date.now()}`);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    setMapKey(`map-${type}-${Date.now()}`);
  }, [type]);

  // Locations state - initialized with server data, updated by ViewportLoader
  const [locations, setLocations] = useState<LocationType[]>(initialLocations);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(initialLocations.length > 0);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const prevTypeRef = useRef(type);

  // Sync locations ONLY when category changes or non-empty SSR locations arrive
  useEffect(() => {
    if (prevTypeRef.current !== type) {
      prevTypeRef.current = type;
      setLocations(initialLocations);
      setHasLoadedOnce(initialLocations.length > 0);
      setLoadError(false);
      return;
    }
    if (initialLocations.length > 0) {
      setLocations(initialLocations);
      setHasLoadedOnce(true);
    }
  }, [type, initialLocations]);

  // Viewport-based loading callbacks
  const handleLocationsLoaded = useCallback((newLocations: LocationType[]) => {
    setLocations(newLocations);
    setHasLoadedOnce(true);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsFetchingLocations(loading);
  }, []);

  const handleErrorChange = useCallback((hasError: boolean) => {
    setLoadError(hasError);
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleZoomOutWider = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const currentZoom = map.getZoom();
    map.setZoom(Math.max(2, currentZoom - 3));
  }, []);

  const handleRetryLoad = useCallback(() => {
    setLoadError(false);
    setRetryKey((k) => k + 1);
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

  // Dynamic map center based on server location / user store / permissions / IP
  const { center: dynamicCenter, isLoading: isCenterLoading, isUserLocation } = useDefaultMapCenter(initialLocation);

  // Map position persistence - remembers where user was on each category
  const { savedPosition, savePosition, hasSavedPosition } = useMapPosition({
    category: type,
    defaultCenter: dynamicCenter,
    defaultZoom: 13,
  });

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

  // Map center priority: Saved position > User's ACTUAL location > Nearby products > Dynamic IP location
  const hasLocations = locations.length > 0;

  // Helper to get coordinates from first location
  const getFirstLocationCoords = () => {
    if (!hasLocations || !locations[0]) return null;
    const coords = getCoordinates(locations[0]);
    return coords ? ([coords.lat, coords.lng] as [number, number]) : null;
  };

  const mapCenter: [number, number] =
    hasSavedPosition && savedPosition
      ? savedPosition.center // User's last valid position for this category
      : isUserLocation
        ? dynamicCenter // User's real GPS location
        : dynamicCenter[0] !== 20.0 || dynamicCenter[1] !== 0.0
          ? dynamicCenter // Resolved dynamic IP / cookie location (e.g. Sacramento)
          : getFirstLocationCoords() || dynamicCenter;

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
              <MapRefBinder onReady={handleMapReady} />

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
                onLoadingChange={handleLoadingChange}
                onErrorChange={handleErrorChange}
                retryKey={retryKey}
              />

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

        {/* Non-blocking status pill while fetching markers on initial load or zoom */}
        {isFetchingLocations && !hasLocations && !isCenterLoading && (
          <div className="pointer-events-none absolute top-4 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
              <span>Searching this area...</span>
            </div>
          </div>
        )}

        {/* Non-blocking retry pill when transient API error occurred */}
        {loadError && !isFetchingLocations && (
          <div className="absolute top-4 left-1/2 z-[1000] -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm">
              <span>Couldn&apos;t load listings in this area</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRetryLoad}
                className="h-6 rounded-full px-2.5 text-xs"
              >
                <RefreshCw className="size-3" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Empty state overlay — shown ONLY after authoritative 200 response returned 0 items */}
        {hasLoadedOnce && !isFetchingLocations && !loadError && !hasLocations && !isCenterLoading && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-1/2">
            <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-border bg-background/95 p-6 shadow-lg backdrop-blur-sm">
              <span className="text-center text-4xl" aria-hidden="true">
                🗺
              </span>
              <p className="text-lg font-semibold text-foreground">No items found</p>
              <p className="max-w-[280px] text-center text-sm text-muted-foreground">
                There are currently no {type === "all" ? "" : `${type} `}items with location data in this area
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleZoomOutWider}
                className="mt-1 rounded-full gap-1.5"
              >
                <ZoomOut className="size-3.5" aria-hidden="true" />
                Zoom out to search wider
              </Button>
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
      <NavigateButtons navigateTo={type === "all" ? "food" : type} title="Show listings" />
    </div>
  );
}

export default MapClient;
