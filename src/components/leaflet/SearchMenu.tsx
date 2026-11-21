"use client";

import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import "leaflet-geosearch/dist/geosearch.css";
import { MAP_CONFIG } from "@/lib/config";
import icon from "@/assets/location-red.svg";
import { type Control, type MarkerOptions, Icon } from "leaflet";

// leaflet-geosearch@4 declares the constructor as `(...options: any[])`,
// which tsrs reports as having no construct signature (TS7009). The
// library's options interface (SearchControlOptions in
// dist/SearchControl.d.ts) is not re-exported from the package entry, so
// the options this call passes are mirrored here and checked through the
// cast. If the library's interface changes, this mirror is the place to
// notice it.
interface SearchMenuControlOptions {
  style?: "button" | "bar";
  notFoundMessage?: string;
  provider: OpenStreetMapProvider;
  showMarker?: boolean;
  retainZoomLevel?: boolean;
  autoClose?: boolean;
  autoCompleteDelay?: number;
  marker?: MarkerOptions;
}

const GeoSearchControlCtor = GeoSearchControl as unknown as new (options: SearchMenuControlOptions) => Control;

export const SearchMenu = () => {
  const map = useMap();
  const controlRef = useRef<Control | null>(null);

  useEffect(() => {
    // Only add the control once
    if (controlRef.current) return;

    // Verify map instance and its control corners exist and are attached
    const mapWithCorners = map as unknown as {
      _controlCorners?: Record<string, HTMLElement>;
      _container?: HTMLElement;
    };
    if (!mapWithCorners?._controlCorners || !mapWithCorners._controlCorners.topleft) {
      return;
    }

    try {
      const provider = new OpenStreetMapProvider({
        params: {
          "accept-language": "en",
          email: MAP_CONFIG.geocodingContactEmail,
        },
      });

      const searchMarkerIcon = new Icon({
        iconUrl: icon.src,
        iconSize: [25, 25],
      });

      const searchControl = new GeoSearchControlCtor({
        style: "button",
        notFoundMessage: "Sorry, that address could not be found.",
        provider: provider,
        showMarker: true,
        retainZoomLevel: true,
        autoClose: true,
        autoCompleteDelay: 250,
        marker: {
          icon: searchMarkerIcon,
          draggable: false,
        },
      });

      controlRef.current = searchControl;
      map.addControl(searchControl);
    } catch (err) {
      console.warn("[SearchMenu] Could not add search control:", err);
      controlRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (controlRef.current) {
        try {
          const mapInstance = map as unknown as {
            _controlCorners?: Record<string, unknown>;
          };
          if (mapInstance?._controlCorners?.topleft) {
            map.removeControl(controlRef.current);
          }
        } catch {
          // Map was already torn down by Leaflet
        } finally {
          controlRef.current = null;
        }
      }
    };
  }, [map]);

  return null;
};
