import { useState, useEffect } from "react";

/**
 * Custom hook to detect scroll position and return compact state for header
 * Airbnb-style scroll behavior: header compacts after scrolling past threshold
 *
 * @param threshold - Scroll distance in pixels before triggering compact mode (default: 80px)
 * @returns Object containing:
 *   - isCompact: boolean indicating if header should be compact
 *   - scrollY: current scroll position in pixels
 */
export const useScrollCompact = (threshold: number = 80) => {
  const [scrollY, setScrollY] = useState(0);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsCompact(currentScrollY > threshold);
    };

    // Set initial scroll position
    handleScroll();

    // Add scroll listener with passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return { isCompact, scrollY };
};
