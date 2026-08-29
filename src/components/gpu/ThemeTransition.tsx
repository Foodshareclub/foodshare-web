"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGPUContext } from "@/lib/gpu";
import type { FrameLoopHandle } from "vgpu";

interface ThemeTransitionProps {
  active: boolean;
  originX: number;
  originY: number;
  isDark: boolean;
  onComplete?: () => void;
}

/**
 * GPU-accelerated radial wipe theme transition.
 * Replaces DOM clip-path animation with a fullscreen fragment shader.
 */
export function ThemeTransition({
  active,
  originX,
  originY,
  isDark,
  onComplete,
}: ThemeTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const gpuRef = useRef<any>(null);

  useEffect(() => {
    if (!supported || !active || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { init, effect, surface, frameLoop } = await import("vgpu");
      const shader = (await import("./ThemeTransition.wgsl")).default;

      const canvas = canvasRef.current!;
      if (cancelled) return;

      const gpu = await init();
      if (cancelled) {
        gpu.dispose();
        return;
      }

      const canvasSurface = surface(gpu, canvas, { dpr: 1, autoResize: false });
      const maxRadius =
        Math.hypot(
          Math.max(originX, window.innerWidth - originX),
          Math.max(originY, window.innerHeight - originY)
        ) * 1.5;

      const transition = effect(gpu, shader, {
        label: "ThemeTransition",
        set: {
          params: {
            progress: 0,
            originX,
            originY,
            maxRadius,
            isDark: isDark ? 1.0 : 0.0,
            resolution: canvasSurface.size,
          },
        },
      });

      gpuRef.current = { gpu, canvasSurface, transition };

      const duration = 500; // ms
      const startTime = performance.now();

      loopRef.current = frameLoop(gpu, (frame) => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        if (progress >= 1.0) {
          loopRef.current?.stop();
          onComplete?.();
          return;
        }

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        transition.set({
          params: {
            progress: eased,
            originX,
            originY,
            maxRadius,
            isDark: isDark ? 1.0 : 0.0,
            resolution: canvasSurface.size,
          },
        });
        frame.pass(canvasSurface, transition);
      });
    }

    start();

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      gpuRef.current?.gpu?.dispose();
      gpuRef.current = null;
      loopRef.current = null;
    };
  }, [supported, active, originX, originY, isDark, onComplete]);

  if (!supported || !active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none"
      style={{ zIndex: 99999 }}
    />
  );
}

/**
 * Hook to trigger GPU theme transition.
 * Falls back to DOM clip-path if WebGPU unavailable.
 */
export function useThemeTransition() {
  const { supported } = useGPUContext();

  const trigger = useCallback(
    (isDark: boolean, x: number, y: number) => {
      if (supported) {
        // GPU path handled by ThemeTransition component
        return { isDark, x, y, useGPU: true };
      }

      // Fallback: DOM clip-path (existing implementation)
      return { isDark, x, y, useGPU: false };
    },
    [supported]
  );

  return { trigger, gpuSupported: supported };
}
