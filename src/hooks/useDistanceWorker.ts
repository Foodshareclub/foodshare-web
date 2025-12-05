import { useCallback, useEffect, useRef } from "react";

interface Product {
  id: number;
  latitude: number;
  longitude: number;
  [key: string]: string | number | boolean | null | undefined | object;
}

/**
 * Hook to use Web Worker for distance calculations
 * Offloads heavy computation to separate thread for better performance
 */
export const useDistanceWorker = () => {
  const workerRef = useRef<Worker | undefined>(undefined);

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(new URL("../workers/distance.worker.ts", import.meta.url), {
      type: "module",
    });

    // Cleanup on unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const calculateDistances = useCallback(
    (userLat: number, userLng: number, products: Product[]): Promise<Product[]> => {
      return new Promise((resolve) => {
        if (!workerRef.current) {
          resolve(products);
          return;
        }

        workerRef.current.onmessage = (e: MessageEvent) => {
          resolve(e.data);
        };

        workerRef.current.postMessage({ userLat, userLng, products });
      });
    },
    []
  );

  return calculateDistances;
};
