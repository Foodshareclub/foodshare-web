'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { saveScrollState, restoreScrollState } from "@/utils/scrollPersistence";

export type ScrollDirection = "up" | "down" | "none";

export interface AdvancedScrollState {
  scrollY: number;
  direction: ScrollDirection;
  isCompact: boolean;
  isHidden: boolean;
  isAtTop: boolean;
  scrollPercentage: number;
}

interface UseAdvancedScrollOptions {
  compactThreshold?: number | "auto";
  hideThreshold?: number | "auto";
  showOnScrollUp?: boolean;
  hideOnScrollDown?: boolean;
  debounceMs?: number;
}

/**
 * Advanced scroll detection hook with direction awareness
 * Airbnb-style behavior: Hide header on down-scroll, show on up-scroll
 *
 * @param options - Configuration options
 * @returns AdvancedScrollState with scroll metrics and behaviors
 */
/**
 * Calculate smart threshold based on viewport height
 * Mobile: 10% of viewport, Desktop: 80px fixed
 */
const calculateSmartThreshold = (viewportHeight: number, baseValue: number | "auto"): number => {
  if (baseValue === "auto") {
    // Mobile gets percentage-based threshold
    if (viewportHeight < 768) {
      return viewportHeight * 0.1; // 10% of viewport
    }
    // Desktop gets fixed threshold
    return 80;
  }
  return baseValue;
};

export const useAdvancedScroll = (options: UseAdvancedScrollOptions = {}) => {
  const {
    compactThreshold = "auto",
    hideThreshold = "auto",
    showOnScrollUp = true,
    hideOnScrollDown = true,
    debounceMs = 0,
  } = options;

  // Calculate smart thresholds based on viewport
  const viewportHeight = window.innerHeight;
  const calculatedCompactThreshold = calculateSmartThreshold(viewportHeight, compactThreshold);
  const calculatedHideThreshold =
    calculateSmartThreshold(viewportHeight, hideThreshold === "auto" ? "auto" : hideThreshold) *
    1.5; // Hide threshold is 1.5x compact threshold

  const [scrollState, setScrollState] = useState<AdvancedScrollState>(() => {
    // Try to restore previous scroll state for smooth navigation
    const restored = restoreScrollState();
    if (restored) {
      return {
        scrollY: restored.scrollY,
        direction: "none",
        isCompact: restored.isCompact,
        isHidden: false, // Never restore hidden state
        isAtTop: restored.scrollY < 10,
        scrollPercentage: 0,
      };
    }
    return {
      scrollY: 0,
      direction: "none",
      isCompact: false,
      isHidden: false,
      isAtTop: true,
      scrollPercentage: 0,
    };
  });

  const lastScrollY = useRef(0);
  const lastDirection = useRef<ScrollDirection>("none");
  const ticking = useRef(false);
  const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateScrollState = useCallback(() => {
    const currentScrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = documentHeight > 0 ? (currentScrollY / documentHeight) * 100 : 0;

    // Determine scroll direction
    let direction: ScrollDirection = "none";
    if (currentScrollY > lastScrollY.current) {
      direction = "down";
    } else if (currentScrollY < lastScrollY.current) {
      direction = "up";
    }

    // Only update direction if it actually changed and scroll moved significantly
    if (Math.abs(currentScrollY - lastScrollY.current) > 5) {
      lastDirection.current = direction;
    }

    // Determine states
    const isAtTop = currentScrollY < 10;
    const isCompact = currentScrollY > calculatedCompactThreshold;

    // Header visibility logic (Airbnb-style)
    let isHidden = false;
    if (!isAtTop && currentScrollY > calculatedHideThreshold) {
      if (hideOnScrollDown && direction === "down") {
        isHidden = true;
      } else if (showOnScrollUp && direction === "up") {
        isHidden = false;
      } else {
        // Maintain previous state if no direction change
        isHidden = scrollState.isHidden;
      }
    }

    const newState = {
      scrollY: currentScrollY,
      direction: lastDirection.current,
      isCompact,
      isHidden,
      isAtTop,
      scrollPercentage,
    };

    setScrollState(newState);

    // Save scroll state for navigation persistence
    saveScrollState(currentScrollY, isCompact);

    lastScrollY.current = currentScrollY;
    ticking.current = false;
  }, [
    calculatedCompactThreshold,
    calculatedHideThreshold,
    showOnScrollUp,
    hideOnScrollDown,
    scrollState.isHidden,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      if (debounceMs > 0) {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
          if (!ticking.current) {
            requestAnimationFrame(updateScrollState);
            ticking.current = true;
          }
        }, debounceMs);
      } else {
        if (!ticking.current) {
          requestAnimationFrame(updateScrollState);
          ticking.current = true;
        }
      }
    };

    // Set initial state
    updateScrollState();

    // Add scroll listener with passive option for performance
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [updateScrollState, debounceMs]);

  return scrollState;
};
