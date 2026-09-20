"use client";

import dynamic from "next/dynamic";

// Leaflet-dependent hooks must stay behind the browser-only boundary too.
export const MapClient = dynamic(() => import("./MapClient").then((module) => module.MapClient), {
  ssr: false,
  loading: () => <output className="block p-8 text-center">Loading map...</output>,
});
