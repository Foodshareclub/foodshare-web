'use client';

/**
 * RAF Throttle Hook
 * Throttles function calls to animation frames with configurable FPS
 * Following ultrathink principles: performant, flexible, reusable
 *
 * Consolidates useRAFThrottle.ts and useRAFThrottle120.ts
 */

import { useCallback, useRef, useEffect } from "react";

/**
 * Throttle function calls to animation frames
 *
 * @param callback - Function to throttle
 * @param fps - Target frames per second (default: 60, max: 120)
 * @returns Throttled version of the callback
 *
 * @example
 * ```typescript
 * function ScrollComponent() {
 *   const handleScroll = useRAFThrottle((event: Event) => {
 *     console.log('Scroll position:', window.scrollY);
 *   }, 60);
 *
 *   useEffect(() => {
 *     window.addEventListener('scroll', handleScroll);
 *     return () => window.removeEventListener('scroll', handleScroll);
 *   }, [handleScroll]);
 * }
 * ```
 */
export function useRAFThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  fps: number = 60
): T {
  const rafRef = useRef<number | undefined>(undefined);
  const lastCallRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Calculate frame time based on FPS
  const frameTime = 1000 / Math.min(fps, 120); // Cap at 120fps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const throttledFn = useCallback(
    (...args: unknown[]) => {
      const now = performance.now();
      const timeSinceLastCall = now - lastCallRef.current;

      // Cancel any pending frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      // If enough time has passed, execute immediately
      if (timeSinceLastCall >= frameTime) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      } else {
        // Otherwise, schedule for next frame
        rafRef.current = requestAnimationFrame(() => {
          lastCallRef.current = performance.now();
          callbackRef.current(...args);
        });
      }
    },
    [frameTime]
  );

  return throttledFn as T;
}

/**
 * Convenience hook for 120fps throttling
 * Useful for high-refresh-rate displays
 *
 * @example
 * ```typescript
 * const handleMouseMove = useRAFThrottle120((event: MouseEvent) => {
 *   console.log('Mouse position:', event.clientX, event.clientY);
 * });
 * ```
 */
export function useRAFThrottle120<T extends (...args: unknown[]) => unknown>(callback: T): T {
  return useRAFThrottle(callback, 120);
}
