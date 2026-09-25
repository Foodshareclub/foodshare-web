"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useEffect, useRef, useState } from "react";
import type { Effect, FrameLoopHandle } from "vgpu";
import { useGPUContext } from "./GPUProvider";
import { initGPURender } from "./useGPURender";

type ShaderLoader = () => Promise<{ default: Parameters<typeof import("vgpu").effect>[1] }>;

/** Optional visual enhancement: content and the CSS fallback never depend on WebGPU. */
export function useDecorativeShader(loadShader: ShaderLoader, label: string, scroll: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef(scroll);
  const { supported } = useGPUContext();
  const motionAllowed = useMediaQuery("(prefers-reduced-motion: no-preference)");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    scrollRef.current = scroll;
  }, [scroll]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (!supported || !motionAllowed || connection?.saveData || !canvas) return;

    let cancelled = false;
    let failed = false;
    let starting = false;
    let painted = false;
    let visible = false;
    const controller = new AbortController();
    let render: Awaited<ReturnType<typeof initGPURender>> | undefined;
    let loop: FrameLoopHandle | undefined;
    let startLoop: (() => FrameLoopHandle) | undefined;

    const stopLoop = () => {
      loop?.stop();
      loop = undefined;
    };
    const fail = (error?: unknown) => {
      if (!cancelled && !failed && process.env.NODE_ENV === "development") {
        console.warn(`[GPU] ${label}: using the CSS fallback`, error);
      }
      failed = true;
      stopLoop();
      render?.dispose();
      if (!cancelled) setReady(false);
    };
    const syncVisibility = () => {
      if (cancelled || failed || !visible || document.visibilityState !== "visible") {
        stopLoop();
      } else if (startLoop && !loop) {
        loop = startLoop();
      } else if (!starting) {
        void start();
      }
    };

    async function start() {
      starting = true;
      try {
        const [{ effect, frameLoop, clock }, shader] = await Promise.all([
          import("vgpu"),
          loadShader(),
        ]);
        if (cancelled) return;
        render = await initGPURender({
          canvasRef,
          signal: controller.signal,
          surfaceOptions: { dpr: [1, 1.5] },
        });
        if (cancelled) {
          render.dispose();
          return;
        }
        const { gpu, surface } = render;
        const decoration: Effect = effect(gpu, shader.default, {
          label,
          set: { params: { time: 0, scroll: scrollRef.current, resolution: surface.size } },
        });
        render.onCleanup(gpu.onError(fail));
        // vgpu 0.3.x only permits surface targets inside a frame. Pre-warm
        // against the actual canvas format without acquiring its swapchain.
        await decoration.compile({ colors: [surface.format] });
        if (cancelled || failed) return;
        render.onCleanup(
          surface.onResize(() => decoration.set({ params: { resolution: surface.size } }))
        );
        const time = clock(gpu);
        startLoop = () =>
          frameLoop(
            gpu,
            (frame) => {
              try {
                decoration.set({ params: { time: time.time, scroll: scrollRef.current } });
                frame.pass(surface, decoration);
                if (!painted) {
                  painted = true;
                  setReady(true);
                }
              } catch (error) {
                // Defer teardown until the current frame has finished submitting.
                queueMicrotask(() => fail(error));
              }
            },
            { fps: 30 }
          );
        syncVisibility();
      } catch (error) {
        fail(error);
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      cancelled = true;
      controller.abort();
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
      stopLoop();
      render?.dispose();
      setReady(false);
    };
  }, [supported, motionAllowed, loadShader, label]);

  return { canvasRef, ready: ready && supported && motionAllowed };
}
