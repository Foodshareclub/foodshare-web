import { useEffect, useState } from "react";
import { useDistanceWorker } from "./useDistanceWorker";
import { getCoordinates, type InitialProductStateType } from "@/types/product.types";

/**
 * Hook to calculate distances for products using Web Worker
 * Offloads heavy computation to separate thread for better UI performance
 */
export const useProductDistanceCalculation = (
  products: InitialProductStateType[],
  userLat: number,
  userLng: number,
  enabled: boolean = true
) => {
  const calculateDistances = useDistanceWorker();
  const [productsWithDistance, setProductsWithDistance] = useState<InitialProductStateType[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!enabled || !products.length || !userLat || !userLng) {
      setProductsWithDistance(products);
      return;
    }

    // Only calculate if we have more than 50 products (otherwise main thread is fine)
    if (products.length < 50) {
      setProductsWithDistance(products);
      return;
    }

    setIsCalculating(true);

    // Transform products to worker format
    const productsForWorker = products.map((p) => {
      const coords = getCoordinates(p);
      return {
        ...p,
        latitude: coords?.lat ?? 0,
        longitude: coords?.lng ?? 0,
      };
    });

    interface WorkerResult {
      products?: InitialProductStateType[];
    }

    calculateDistances(userLat, userLng, productsForWorker)
      .then((result: unknown) => {
        const typedResult = result as WorkerResult | InitialProductStateType[];
        const products = Array.isArray(typedResult) ? typedResult : typedResult.products || [];
        setProductsWithDistance(products as InitialProductStateType[]);
        setIsCalculating(false);
      })
      .catch((error) => {
        console.error("Distance calculation error:", error);
        setProductsWithDistance(products);
        setIsCalculating(false);
      });
  }, [products, userLat, userLng, enabled, calculateDistances]);

  return { productsWithDistance, isCalculating };
};
