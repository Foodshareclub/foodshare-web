"use client";

import { useEffect, useRef } from "react";
import { useGPUContext } from "@/lib/gpu";
import { initGPURender } from "@/lib/gpu/useGPURender";
import type { FrameLoopHandle } from "vgpu";

interface GradientBackgroundProps {
  className?: string;
  scroll?: number;
}

/**
 * GPU-accelerated animated gradient background.
 * Replaces CSS `background-size: 400% 400%` animation with a fragment shader.
 *
 * Uses shared GPU device pool. Scroll passed as ref to avoid re-init.
 */
export function GradientBackground({ className = "", scroll = 0 }: GradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const renderRef = useRef<Awaited<ReturnType<typeof initGPURender>> | null>(null);
  const scrollRef = useRef(scroll);

  useEffect(() => {
    scrollRef.current = scroll;
  }, [scroll]);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;

    let cancelled = false;

    async function start() {
      const { effect, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./GradientBackground.wgsl")).default;

      const render = await initGPURender({ canvasRef, enabled: true });
      if (cancelled) {
        render.dispose();
        return;
      }

      renderRef.current = render;

      const gradientEffect = effect(render.gpu, shader, {
        label: "GradientBackground",
        set: { params: { time: 0, scroll: scrollRef.current, resolution: render.surface.size } },
      });

      await render.warmUp(gradientEffect);

      const unsubResize = render.surface.onResize(() => {
        gradientEffect.set({ params: { resolution: render.surface.size } });
      });
      render.onCleanup(unsubResize);

      const time = clock(render.gpu);

      loopRef.current = frameLoop(render.gpu, (frame) => {
        gradientEffect.set({
          params: { time: time.time, scroll: scrollRef.current, resolution: render.surface.size },
        });
        frame.pass(render.surface, gradientEffect);
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
