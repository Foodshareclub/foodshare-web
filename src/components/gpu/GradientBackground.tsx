"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import type { FrameLoopHandle } from "vgpu";

interface GradientBackgroundProps {
  className?: string;
  scroll?: number;
}

/**
 * GPU-accelerated animated gradient background.
 * Replaces CSS `background-size: 400% 400%` animation with a fragment shader.
 */
export function GradientBackground({ className = "", scroll = 0 }: GradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const gpuRef = useRef<any>(null);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { init, effect, surface, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./GradientBackground.wgsl")).default;

      const canvas = canvasRef.current!;
      if (cancelled) return;

      const gpu = await init();
      if (cancelled) {
        gpu.dispose();
        return;
      }

      const canvasSurface = surface(gpu, canvas, { dpr: [1, 2], autoResize: true });
      const gradientEffect = effect(gpu, shader, {
        label: "GradientBackground",
        set: { params: { time: 0, scroll, resolution: canvasSurface.size } },
      });

      canvasSurface.onResize(() => {
        gradientEffect.set({ params: { resolution: canvasSurface.size } });
      });

      const time = clock(gpu);
      gpuRef.current = { gpu, canvasSurface, gradientEffect };

      loopRef.current = frameLoop(gpu, (frame) => {
        gradientEffect.set({ params: { time: time.time, scroll, resolution: canvasSurface.size } });
        frame.pass(canvasSurface, gradientEffect);
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
  }, [supported, scroll]);

  if (!supported) {
    return (
      <div
        className={`absolute top-0 left-0 right-0 bottom-0 -z-10 ${className}`}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,69,0,0.03) 0%, rgba(255,165,0,0.03) 50%, rgba(255,69,0,0.03) 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientFlow 15s ease infinite",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 -z-10 w-full h-full ${className}`}
      style={{ pointerEvents: "none" }}
    />
  );
}
