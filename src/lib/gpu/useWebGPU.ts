"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clock, Frame, FrameLoopHandle, Gpu, Surface } from "vgpu";
import { acquireGPU, releaseGPU } from "./GPUDevicePool";

export interface WebGPUState {
  supported: boolean;
  loading: boolean;
  error: Error | null;
}

function detectWebGPUSupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator && Boolean(navigator.gpu);
}

/**
 * Detects WebGPU browser support after hydration.
 * Returns a stable reference across re-renders.
 */
export function useWebGPU(): WebGPUState {
  // A cached client capability must not change the first hydration render.
  const [state, setState] = useState<WebGPUState>({ supported: false, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const supported = detectWebGPUSupport();
        if (cancelled) return;
        setState({ supported, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState({
          supported: false,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Initialize vgpu lazily — only when the component actually needs GPU.
 * Uses the shared device pool so multiple components share one GPUDevice.
 * Returns a ref-stable init function and cleanup.
 */
export function useGPUInit() {
  const gpuRef = useRef<{
    gpu: Gpu;
    canvasSurface: Surface;
    time: Clock;
    frameLoop: typeof import("vgpu").frameLoop;
  } | null>(null);
  const loopRef = useRef<FrameLoopHandle | null>(null);
  const hasAcquired = useRef(false);

  const initGPU = useCallback(async (canvas: HTMLCanvasElement) => {
    if (gpuRef.current) return gpuRef.current;

    const { surface, clock } = await import("vgpu");
    const frameLoopFn = (await import("vgpu")).frameLoop;

    const { gpu } = await acquireGPU();
    hasAcquired.current = true;

    const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
    const time = clock(gpu);

    gpuRef.current = { gpu, canvasSurface, time, frameLoop: frameLoopFn };
    return gpuRef.current;
  }, []);

  const startLoop = useCallback(
    (callback: (frame: Frame, ctx: { time: number; texel: readonly [number, number] }) => void) => {
      if (!gpuRef.current) return;
      const { gpu, canvasSurface, time, frameLoop: frameLoopFn } = gpuRef.current;

      loopRef.current = frameLoopFn(gpu, (frame) => {
        callback(frame, {
          time: time.time,
          texel: canvasSurface.texelSize,
        });
      });
    },
    [],
  );

  const cleanup = useCallback(() => {
    loopRef.current?.stop();
    gpuRef.current = null;
    loopRef.current = null;
    if (hasAcquired.current) {
      releaseGPU();
      hasAcquired.current = false;
    }
  }, []);

  return { initGPU, startLoop, cleanup };
}
