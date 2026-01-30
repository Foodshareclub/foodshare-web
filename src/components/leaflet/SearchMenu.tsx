'use client';

import { useEffect, useRef } from "react";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import { useMap } from "react-leaflet";
import "leaflet-geosearch/dist/geosearch.css";
import { Icon } from "leaflet";
import icon from "@/assets/location-red.svg";

export const SearchMenu = () => {
  const map = useMap();
  const controlRef = useRef<any>(null);

  useEffect(() => {
    // Only add the control once
    if (controlRef.current) return;

    const provider = new OpenStreetMapProvider({
      params: {
        "accept-language": "en",
        email: "yarmoshkoden18m@gmail.com", // auth for large number of requests
      },
    });

    const searchMarkerIcon = new Icon({
      iconUrl: icon.src,
      iconSize: [25, 25],
    });

    // @ts-ignore
    const searchControl = new GeoSearchControl({
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

    // Cleanup on unmount
    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
    };
  }, [map]);

  return null;
};
