"use client";

import { useState, useEffect, useRef } from "react";

interface GPUMetrics {
  fps: number;
  frameTime: number;
  supported: boolean;
  quality: "high" | "medium" | "low";
}

/**
 * Monitors GPU rendering performance.
 * Auto-downgrades quality when FPS drops below threshold.
 */
export function useGPUPerformance(): GPUMetrics {
  const [metrics, setMetrics] = useState<GPUMetrics>({
    fps: 60,
    frameTime: 16.67,
    supported: false,
    quality: "high",
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = !!(navigator as any).gpu;

    function measure() {
      const now = performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS every 30 frames
      if (frameTimesRef.current.length % 30 === 0) {
        const avg = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const fps = Math.round(1000 / avg);

        let quality: GPUMetrics["quality"] = "high";
        if (fps < 30) quality = "low";
        else if (fps < 50) quality = "medium";

        setMetrics({ fps, frameTime: avg, supported, quality });
      }

      rafRef.current = requestAnimationFrame(measure);
    }

    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return metrics;
}

/**
 * Returns a quality-adaptive particle count based on device performance.
 */
export function useAdaptiveParticleCount(base: number): number {
  const { quality } = useGPUPerformance();

  switch (quality) {
    case "high":
      return base;
    case "medium":
      return Math.floor(base * 0.6);
    case "low":
      return Math.floor(base * 0.3);
  }
}
