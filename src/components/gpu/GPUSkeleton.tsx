"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import { initGPURender } from "@/lib/gpu/useGPURender";
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
 *
 * Uses shared GPU device pool. Pre-warms pipeline.
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
  const renderRef = useRef<Awaited<ReturnType<typeof initGPURender>> | null>(null);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { effect, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./GPUSkeleton.wgsl")).default;

      const render = await initGPURender({ canvasRef, enabled: true });
      if (cancelled) {
        render.dispose();
        return;
      }

      renderRef.current = render;

      const skeleton = effect(render.gpu, shader, {
        label: "GPUSkeleton",
        set: { params: { time: 0, resolution: render.surface.size, borderRadius: 12 } },
      });

      await render.warmUp(skeleton);

      const unsubResize = render.surface.onResize(() => {
        skeleton.set({ params: { resolution: render.surface.size } });
      });
      render.onCleanup(unsubResize);

      const time = clock(render.gpu);

      loopRef.current = frameLoop(render.gpu, (frame) => {
        skeleton.set({
          params: { time: time.time, resolution: render.surface.size, borderRadius: 12 },
        });
        frame.pass(render.surface, skeleton);
      });
    }

    start();

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
      renderRef.current?.dispose();
      renderRef.current = null;
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
