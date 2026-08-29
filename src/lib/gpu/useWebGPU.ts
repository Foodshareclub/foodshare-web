"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface WebGPUState {
  supported: boolean;
  loading: boolean;
  error: Error | null;
}

const CACHE_KEY = "foodshare:webgpu:supported";

function detectWebGPUSupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!(navigator as any).gpu;
}

/**
 * Detects WebGPU browser support with aggressive caching.
 * Returns a stable reference across re-renders.
 */
export function useWebGPU(): WebGPUState {
  const [state, setState] = useState<WebGPUState>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached !== null) {
        return { supported: cached === "true", loading: false, error: null };
      }
    }
    return { supported: false, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const supported = detectWebGPUSupport();
        if (cancelled) return;
        sessionStorage.setItem(CACHE_KEY, String(supported));
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
 * Returns a ref-stable init function and cleanup.
 */
export function useGPUInit() {
  const gpuRef = useRef<any>(null);
  const loopRef = useRef<any>(null);

  const initGPU = useCallback(async (canvas: HTMLCanvasElement) => {
    if (gpuRef.current) return gpuRef.current;

    const { init, surface, clock } = await import("vgpu");
    const frameLoopFn = (await import("vgpu")).frameLoop;

    const gpu = await init();
    const canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
    const time = clock(gpu);

    gpuRef.current = { gpu, canvasSurface, time, frameLoop: frameLoopFn };
    return gpuRef.current;
  }, []);

  const startLoop = useCallback(
    (callback: (frame: any, ctx: { time: number; texel: [number, number] }) => void) => {
      if (!gpuRef.current) return;
      const { gpu, canvasSurface, time, frameLoop: frameLoopFn } = gpuRef.current;

      loopRef.current = frameLoopFn(gpu, (frame: any) => {
        callback(frame, {
          time: time.time,
          texel: canvasSurface.texelSize,
        });
      });
    },
    []
  );

  const cleanup = useCallback(() => {
    loopRef.current?.stop();
    gpuRef.current?.gpu?.dispose();
    gpuRef.current = null;
    loopRef.current = null;
  }, []);

  return { initGPU, startLoop, cleanup };
}
