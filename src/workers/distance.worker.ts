/**
 * Web Worker for CPU-intensive distance calculations
 * Offloads computation from main thread for better UI performance
 */

interface Product {
  id: number;
  location: any; // PostGIS
  [key: string]: any;
}

interface WorkerMessage {
  userLat: number;
  userLng: number;
  products: Product[];
}

/**
 * Parse PostGIS POINT to lat/lng
 */
function parsePostGISPoint(location: any): { latitude: number; longitude: number } | null {
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
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

self.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
  const { userLat, userLng, products } = e.data;

  const productsWithDistance = products.map((product: Product) => {
    if (!product.location) {
      return { ...product, distance: Infinity };
    }

    const coords = parsePostGISPoint(product.location);
    if (!coords) {
      return { ...product, distance: Infinity };
    }

    const distance = calculateDistance(userLat, userLng, coords.latitude, coords.longitude);

    return {
      ...product,
      distance,
    };
  });

  self.postMessage({ products: productsWithDistance });
});
