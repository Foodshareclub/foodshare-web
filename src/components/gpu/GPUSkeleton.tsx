"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import type { FrameLoopHandle } from "vgpu";

interface GPUSkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/**
 * GPU-accelerated loading skeleton with animated shimmer.
 * Falls back to CSS pulse animation on unsupported browsers.
 */
export function GPUSkeleton({
  className = "",
  width = "100%",
  height = "20px",
  rounded = "rounded-xl",
}: GPUSkeletonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const gpuRef = useRef<any>(null);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { init, effect, surface, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./GPUSkeleton.wgsl")).default;

      const canvas = canvasRef.current!;
      if (cancelled) return;

      const gpu = await init();
      if (cancelled) {
        gpu.dispose();
        return;
      }

      const canvasSurface = surface(gpu, canvas, { dpr: [1, 2], autoResize: true });
      const skeleton = effect(gpu, shader, {
        label: "GPUSkeleton",
        set: { params: { time: 0, resolution: canvasSurface.size, borderRadius: 12 } },
      });

      canvasSurface.onResize(() => {
        skeleton.set({ params: { resolution: canvasSurface.size } });
      });

      const time = clock(gpu);
      gpuRef.current = { gpu, canvasSurface, skeleton };

      loopRef.current = frameLoop(gpu, (frame) => {
        skeleton.set({
          params: { time: time.time, resolution: canvasSurface.size, borderRadius: 12 },
        });
        frame.pass(canvasSurface, skeleton);
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
  }, [supported]);

  // CSS fallback
  if (!supported) {
    return (
      <div className={`animate-pulse bg-muted ${rounded} ${className}`} style={{ width, height }} />
    );
  }

  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ width, height }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

/**
 * Compound skeleton for common layouts.
 */
export function GPUSkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <GPUSkeleton height="200px" rounded="rounded-2xl" />
      <GPUSkeleton width="60%" height="16px" />
      <GPUSkeleton width="40%" height="12px" />
    </div>
  );
}

export function GPUSkeletonList({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <GPUSkeleton width="48px" height="48px" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <GPUSkeleton width="70%" height="14px" />
            <GPUSkeleton width="40%" height="10px" />
          </div>
        </div>
      ))}
    </div>
  );
}
