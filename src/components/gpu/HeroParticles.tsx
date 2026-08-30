"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import { useSmoothScrollGPU } from "@/lib/gpu/useScrollGPU";
import { initGPURender } from "@/lib/gpu/useGPURender";
import type { FrameLoopHandle } from "vgpu";

interface HeroParticlesProps {
  className?: string;
  count?: number;
  opacity?: number;
}

/**
 * GPU hero particles — 200+ floating particles with scroll parallax.
 * Replaces Framer Motion particle arrays.
 *
 * Uses shared GPU device pool. Scroll is already via ref (good).
 */
export function HeroParticles({ className = "", count = 200, opacity = 1 }: HeroParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const scroll = useSmoothScrollGPU(0.05);
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const renderRef = useRef<Awaited<ReturnType<typeof initGPURender>> | null>(null);
  const scrollRef = useRef(0);

  // Keep scroll ref in sync without re-triggering effect
  useEffect(() => {
    scrollRef.current = scroll;
  }, [scroll]);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { draw, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./HeroParticles.wgsl")).default;

      const render = await initGPURender({ canvasRef, enabled: true });
      if (cancelled) {
        render.dispose();
        return;
      }

      renderRef.current = render;

      const particles = draw(render.gpu, {
        shader,
        label: "HeroParticles",
        vertices: 3,
        instances: count,
        set: {
          params: {
            time: 0,
            scroll: 0,
            resolution: render.surface.size,
            particleCount: count,
          },
        },
      });

      await render.warmUp(particles);

      const unsubResize = render.surface.onResize(() => {
        particles.set({ params: { resolution: render.surface.size } });
      });
      render.onCleanup(unsubResize);

      const time = clock(render.gpu);

      loopRef.current = frameLoop(render.gpu, (frame) => {
        particles.set({
          params: {
            time: time.time,
            scroll: scrollRef.current,
            resolution: render.surface.size,
            particleCount: count,
          },
        });
        frame.pass(render.surface, particles);
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
