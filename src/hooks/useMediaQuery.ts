"use client";

import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      if (media.addEventListener) {
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
      }
      media.addListener(onChange);
      return () => media.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  // Use the same snapshot for SSR and the first hydration render. React then
  // subscribes to the actual viewport, including subsequent breakpoint changes.
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useMediaQuery;
export { useMediaQuery };
