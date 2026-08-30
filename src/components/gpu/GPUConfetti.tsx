"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useGPUContext } from "@/lib/gpu";
import { acquireGPU, releaseGPU } from "@/lib/gpu/GPUDevicePool";
import type { FrameLoopHandle } from "vgpu";

interface GPUConfettiProps {
  /** Trigger a confetti burst */
  active?: boolean;
  /** Number of particles (default: 5000) */
  particles?: number;
  /** Duration in seconds (default: 3) */
  duration?: number;
  className?: string;
}

/**
 * GPU-accelerated confetti particle system.
 * Renders 5000+ particles at 60fps using instanced vertex shaders.
 * Falls back to canvas-confetti on unsupported browsers.
 *
 * Uses shared GPU device pool. Pre-warms pipeline on first burst.
 */
export function GPUConfetti({
  active = false,
  particles = 5000,
  duration = 3,
  className = "",
}: GPUConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { supported } = useGPUContext();
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const gpuRef = useRef<any>(null);
  const hasAcquired = useRef(false);
  const [burstTime, setBurstTime] = useState(-10);

  // Trigger burst
  useEffect(() => {
    if (active) {
      setBurstTime(performance.now() / 1000);
    }
  }, [active]);

  useEffect(() => {
    if (!supported || !canvasRef.current) return;
    if (burstTime < 0) return;

    let cancelled = false;

    async function start() {
      const { draw, surface, frameLoop, clock } = await import("vgpu");
      const shader = (await import("./GPUConfetti.wgsl")).default;

      const { gpu } = await acquireGPU();
      hasAcquired.current = true;

      if (cancelled) {
        releaseGPU();
        return;
      }

      const canvasSurface = surface(gpu, canvasRef.current!, { dpr: [1, 2], autoResize: true });

      const confetti = draw(gpu, {
        shader,
        label: "GPUConfetti",
        vertices: 3,
        instances: particles,
        set: {
          params: {
            time: 0,
            burstTime,
            resolution: canvasSurface.size,
          },
        },
      });

      // Pre-warm pipeline
      try {
        await confetti.compile(canvasSurface);
      } catch {
        // best-effort
      }

      const time = clock(gpu);
      gpuRef.current = { gpu, canvasSurface, confetti };

      const stopTime = burstTime + duration;

      loopRef.current = frameLoop(gpu, (frame) => {
        const now = time.time;
        if (now > stopTime) {
          loopRef.current?.stop();
          return;
        }
        confetti.set({
          params: { time: now, burstTime, resolution: canvasSurface.size },
        });
        frame.pass(canvasSurface, confetti);
      });
    }

    start();

    return () => {
      cancelled = true;
      loopRef.current?.stop();
      loopRef.current = null;
      gpuRef.current = null;
      if (hasAcquired.current) {
        releaseGPU();
        hasAcquired.current = false;
      }
    };
  }, [supported, burstTime, particles, duration]);

  // Fallback: canvas-confetti
  if (!supported) {
    return null; // Caller should use canvas-confetti directly
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 50 }}
    />
  );
}

/**
 * Hook that returns a trigger function for GPU confetti.
 * Falls back to canvas-confetti automatically.
 */
export function useConfetti() {
  const { supported } = useGPUContext();
  const [active, setActive] = useState(false);

  const trigger = useCallback(async () => {
    if (supported) {
      setActive(true);
      setTimeout(() => setActive(false), 100);
    } else {
      // Fallback to canvas-confetti
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FF2D55", "#00A699", "#FFD700"],
      });
    }
  }, [supported]);

  return { trigger, active };
}
