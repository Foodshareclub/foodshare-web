/**
 * Web Worker for CPU-intensive distance calculations
 * Offloads computation from main thread for better UI performance
 */

import { haversineDistanceKm } from "@/utils/postgis";

interface PostGISPoint {
  type?: string;
  coordinates?: [number, number];
}

interface Product {
  id: number;
  location: PostGISPoint | string | null;
  [key: string]: string | number | boolean | null | undefined | object;
}

interface WorkerMessage {
  userLat: number;
  userLng: number;
  products: Product[];
}

/**
 * Parse PostGIS POINT to lat/lng
 */
function parsePostGISPoint(location: PostGISPoint | string | null): { latitude: number; longitude: number } | null {
  if (!location) return null;

  if (typeof location === "object" && location.coordinates && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    if (typeof lat === "number" && typeof lng === "number") {
      return { latitude: lat, longitude: lng };
    }
  }

  if (typeof location === "string") {
    const match = location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (match) {
      const lng = Number.parseFloat(match[1]);
      const lat = Number.parseFloat(match[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}

self.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
  const { userLat, userLng, products } = e.data;

  const productsWithDistance = products.map((product: Product) => {
    if (!product.location) {
      return { ...product, distance: Number.POSITIVE_INFINITY };
    }

    const coords = parsePostGISPoint(product.location);
    if (!coords) {
      return { ...product, distance: Number.POSITIVE_INFINITY };
    }

    const distance = haversineDistanceKm(userLat, userLng, coords.latitude, coords.longitude);

    return {
      ...product,
      distance,
    };
  });

  self.postMessage({ products: productsWithDistance });
});
