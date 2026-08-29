"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import { useSmoothScrollGPU } from "@/lib/gpu/useScrollGPU";
import type { FrameLoopHandle } from "vgpu";

interface HeroParticlesProps {
  className?: string;
  count?: number;
  opacity?: number;
}

/**
 * GPU hero particles — 200+ floating particles with scroll parallax.
 * Replaces Framer Motion particle arrays.
 */
export function HeroParticles({ className = "", count = 200, opacity = 1 }: HeroParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const scroll = useSmoothScrollGPU(0.05);
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const gpuRef = useRef<any>(null);
  const scrollRef = useRef(0);

  // Keep scroll ref in sync without re-triggering effect
  useEffect(() => {
    scrollRef.current = scroll;
  }, [scroll]);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { init, draw, surface, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./HeroParticles.wgsl")).default;

      const canvas = canvasRef.current!;
      if (cancelled) return;

      const gpu = await init();
      if (cancelled) {
        gpu.dispose();
        return;
      }

      const canvasSurface = surface(gpu, canvas, { dpr: [1, 2], autoResize: true });
      const particles = draw(gpu, {
        shader,
        label: "HeroParticles",
        vertices: 3,
        instances: count,
        set: {
          params: {
            time: 0,
            scroll: 0,
            resolution: canvasSurface.size,
            particleCount: count,
          },
        },
      });

      canvasSurface.onResize(() => {
        particles.set({ params: { resolution: canvasSurface.size } });
      });

      const time = clock(gpu);
      gpuRef.current = { gpu, canvasSurface, particles };

      loopRef.current = frameLoop(gpu, (frame) => {
        particles.set({
          params: {
            time: time.time,
            scroll: scrollRef.current,
            resolution: canvasSurface.size,
            particleCount: count,
          },
        });
        frame.pass(canvasSurface, particles);
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
  }, [supported, count]);

  if (!supported) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity, zIndex: 1 }}
    />
  );
}
