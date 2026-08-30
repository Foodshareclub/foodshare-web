"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import { initGPURender } from "@/lib/gpu/useGPURender";
import type { FrameLoopHandle } from "vgpu";

interface FloatingOrbsProps {
  className?: string;
  scroll?: number;
  opacity?: number;
}

/**
 * GPU-accelerated floating orbs background.
 * Renders 5 animated gradient circles in a single fullscreen fragment shader.
 * Falls back to CSS blur circles when WebGPU is unavailable.
 *
 * Uses shared GPU device pool — no redundant init() calls.
 * Scroll is passed as a ref to avoid pipeline teardown on scroll.
 */
export function FloatingOrbs({ className = "", scroll = 0, opacity = 1 }: FloatingOrbsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const renderRef = useRef<Awaited<ReturnType<typeof initGPURender>> | null>(null);
  const scrollRef = useRef(scroll);

  // Keep scroll ref in sync without re-triggering effect
  useEffect(() => {
    scrollRef.current = scroll;
  }, [scroll]);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { effect, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./FloatingOrbs.wgsl")).default;

      const render = await initGPURender({ canvasRef, enabled: true });
      if (cancelled) {
        render.dispose();
        return;
      }

      renderRef.current = render;

      const orbEffect = effect(render.gpu, shader, {
        label: "FloatingOrbs",
        set: { params: { time: 0, scroll: scrollRef.current, resolution: render.surface.size } },
      });

      // Pre-warm pipeline to avoid first-frame jank
      await render.warmUp(orbEffect);

      const unsubResize = render.surface.onResize(() => {
        orbEffect.set({ params: { resolution: render.surface.size } });
      });
      render.onCleanup(unsubResize);

      const time = clock(render.gpu);

      loopRef.current = frameLoop(render.gpu, (frame) => {
        orbEffect.set({
          params: { time: time.time, scroll: scrollRef.current, resolution: render.surface.size },
        });
        frame.pass(render.surface, orbEffect);
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
  }, [supported]); // scroll is via ref, no need in deps

  // CSS fallback positions (matches original deterministic positions)
  const ORB_FALLBACK = [
    { top: "15%", left: "72%", size: 200, color: "rgba(255,99,71,0.15)" },
    { top: "48%", left: "23%", size: 250, color: "rgba(255,165,0,0.12)" },
    { top: "78%", left: "85%", size: 300, color: "rgba(255,69,0,0.18)" },
    { top: "32%", left: "45%", size: 350, color: "rgba(255,85,53,0.10)" },
    { top: "65%", left: "10%", size: 400, color: "rgba(255,115,77,0.14)" },
  ];

  if (!supported) {
    return (
      <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`} style={{ opacity }}>
        {ORB_FALLBACK.map((orb, i) => (
          <div
            key={i}
            className="absolute rounded-full -z-10 blur-[40px] gpu-gradient"
            style={{
              width: orb.size,
              height: orb.size,
              top: orb.top,
              left: orb.left,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              animation: `orbFloat${i} ${10 + i * 2}s ease-in-out infinite`,
            }}
          />
        ))}
        <style jsx>{`
          ${ORB_FALLBACK.map(
            (_, i) => `
            @keyframes orbFloat${i} {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(${10 + i * 5}px, ${-15 + i * 3}px) scale(1.1); }
              66% { transform: translate(${-8 + i * 4}px, ${12 - i * 2}px) scale(0.95); }
            }
          `
          ).join("")}
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 -z-10 w-full h-full ${className}`}
      style={{ opacity, pointerEvents: "none" }}
    />
  );
}
