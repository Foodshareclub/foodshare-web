"use client";

import type { Draw, Effect, Gpu, Surface } from "vgpu";
import { acquireGPU } from "./GPUDevicePool";

interface GPURenderOptions {
  /** Canvas ref to attach the surface to */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** Whether rendering is enabled */
  enabled?: boolean;
  /** Cancels initialization before a detached or reused canvas is claimed. */
  signal?: AbortSignal;
  /** Surface options */
  surfaceOptions?: { dpr?: number | [number, number]; autoResize?: boolean };
}

interface GPURenderHandle {
  /** Shared GPU device */
  gpu: Gpu;
  /** Canvas surface */
  surface: Surface;
  /** Register a cleanup function to run on unmount */
  onCleanup: (fn: () => void) => void;
  /** Pre-warm a pipeline against this surface */
  warmUp: (pipeline: Effect | Draw) => Promise<void>;
  /** Release shared device reference and run cleanup functions */
  dispose: () => void;
}

/**
 * Shared hook for GPU components. Manages:
 * 1. Shared device acquisition (one init() across all components)
 * 2. Per-component surface creation
 * 3. Pipeline pre-warming
 * 4. Cleanup on unmount
 *
 * Replaces the duplicated init/surface/frameLoop/cleanup pattern in every GPU component.
 *
 * Usage:
 * ```tsx
 * const canvasRef = useRef<HTMLCanvasElement>(null);
 * const { supported } = useGPUContext();
 *
 * useEffect(() => {
 *   if (!supported || !canvasRef.current) return;
 *   let cancelled = false;
 *
 *   async function start() {
 *     const render = await initGPURender({ canvasRef, enabled: true });
 *     if (cancelled) { render.dispose(); return; }
 *
 *     const shader = (await import("./MyShader.wgsl")).default;
 *     const myEffect = effect(render.gpu, shader, { ... });
 *     await render.warmUp(myEffect);
 *
 *     const time = clock(render.gpu);
 *     loopRef.current = frameLoop(render.gpu, (frame) => {
 *       myEffect.set({ params: { time: time.time } });
 *       frame.pass(render.surface, myEffect);
 *     });
 *   }
 *
 *   start();
 *   return () => { cancelled = true; loopRef.current?.stop(); render.dispose(); };
 * }, [supported]);
 * ```
 */
export async function initGPURender(options: GPURenderOptions): Promise<GPURenderHandle> {
  const { canvasRef, enabled = true, surfaceOptions, signal } = options;

  if (!enabled || !canvasRef.current) {
    throw new Error("initGPURender: canvas not ready");
  }

  signal?.throwIfAborted();
  const canvas = canvasRef.current;
  const { gpu, release } = await acquireGPU();
  let canvasSurface: Surface;
  try {
    const { surface: createSurface } = await import("vgpu");
    signal?.throwIfAborted();
    if (canvasRef.current !== canvas)
      throw new Error("initGPURender: canvas detached during initialization");
    canvasSurface = createSurface(gpu, canvas, {
      dpr: surfaceOptions?.dpr ?? [1, 2],
      autoResize: surfaceOptions?.autoResize ?? true,
    });
  } catch (error) {
    release();
    throw error;
  }

  const cleanupFns: (() => void)[] = [];
  let disposed = false;

  return {
    gpu,
    surface: canvasSurface,
    onCleanup: (fn: () => void) => {
      if (disposed) fn();
      else cleanupFns.push(fn);
    },
    warmUp: async (pipeline: Effect | Draw) => {
      try {
        await pipeline.compile({ colors: [canvasSurface.format] });
      } catch {
        // Pre-warming is best-effort; don't break rendering if it fails
      }
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      try {
        for (const fn of cleanupFns.splice(0)) {
          try {
            fn();
          } catch {
            // A failing listener must not prevent the remaining resources from releasing.
          }
        }
      } finally {
        try {
          canvasSurface.dispose();
        } finally {
          release();
        }
      }
    },
  };
}
