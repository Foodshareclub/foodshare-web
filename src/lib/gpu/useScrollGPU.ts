"use client";

import { useState, useEffect, useRef } from "react";

interface ScrollGPUState {
  /** Normalized scroll position 0-1 */
  progress: number;
  /** Scroll direction: 1 = down, -1 = up, 0 = none */
  direction: number;
  /** Whether user is actively scrolling */
  isScrolling: boolean;
  /** Viewport dimensions */
  viewport: { width: number; height: number };
}

/**
 * Tracks scroll position and provides values for GPU shader uniforms.
 * Throttled to rAF for 60fps GPU updates.
 *
 * Usage in GPU components:
 * const { progress, direction } = useScrollGPU();
 * shader.set({ params: { scroll: progress, ... } });
 */
export function useScrollGPU(): ScrollGPUState {
  const [state, setState] = useState<ScrollGPUState>({
    progress: 0,
    direction: 0,
    isScrolling: false,
    viewport: { width: 0, height: 0 },
  });

  const lastScrollRef = useRef(0);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      setState((prev) => ({
        ...prev,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));
    };

    updateViewport();

    function onScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
        const direction =
          scrollTop > lastScrollRef.current ? 1 : scrollTop < lastScrollRef.current ? -1 : 0;
        lastScrollRef.current = scrollTop;

        setState((prev) => ({
          ...prev,
          progress,
          direction,
          isScrolling: true,
        }));

        // Debounce scrolling state
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, isScrolling: false }));
        }, 150);
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateViewport, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateViewport);
      cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return state;
}

/**
 * Provides a smooth, interpolated scroll value for GPU shaders.
 * Uses exponential smoothing to avoid jitter.
 */
export function useSmoothScrollGPU(smoothing = 0.1): number {
  const [smooth, setSmooth] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      targetRef.current = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
    }

    function animate() {
      // Exponential smoothing
      currentRef.current += (targetRef.current - currentRef.current) * smoothing;
      setSmooth(currentRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [smoothing]);

  return smooth;
}
