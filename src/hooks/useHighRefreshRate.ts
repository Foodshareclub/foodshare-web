'use client';

import { useEffect, useState } from "react";

/**
 * Detects high refresh rate displays (120Hz+) and provides optimized frame timing
 * Modern displays support 120Hz, 144Hz, or even 240Hz refresh rates
 */
export const useHighRefreshRate = () => {
  const [refreshRate, setRefreshRate] = useState(60);
  const [isHighRefreshRate, setIsHighRefreshRate] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    const lastTime = performance.now();
    let rafId: number;

    const detectRefreshRate = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      // After 60 frames, calculate refresh rate
      if (frameCount >= 60) {
        const fps = Math.round((frameCount / elapsed) * 1000);
        setRefreshRate(fps);
        setIsHighRefreshRate(fps > 90); // Consider 90+ as high refresh rate
        return;
      }

      rafId = requestAnimationFrame(detectRefreshRate);
    };

    rafId = requestAnimationFrame(detectRefreshRate);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { refreshRate, isHighRefreshRate };
};
