"use client";

/**
 * GPUDevicePool — ensures a single GPUDevice is shared across all components.
 *
 * Problem: Each GPU component called init() independently, creating 3-5 separate
 * GPUDevices on pages like the home page (FloatingOrbs + GradientBackground +
 * HeroParticles). Each device allocates its own VRAM, command queue, and pipeline caches.
 *
 * Solution: Reference-counted singleton. First component triggers init(), last
 * component to unmount calls dispose(). Components share the same device.
 */

import type { Gpu } from "vgpu";

interface PoolEntry {
  gpu: Gpu | null;
  refCount: number;
  ready: Promise<Gpu>;
}

let pool: PoolEntry | null = null;

export interface SharedGPU {
  gpu: Gpu;
  ready: Promise<Gpu>;
  /** Releases this acquisition exactly once, even during overlapping cleanup. */
  release: () => void;
}

/**
 * Acquire a shared GPU device. Increments ref count.
 * First caller triggers init(); subsequent callers reuse the same device.
 */
export async function acquireGPU(): Promise<SharedGPU> {
  if (!pool) {
    // Publish the pending initialization before yielding. Concurrent canvases
    // must share the same promise as well as the same resolved device.
    const entry: PoolEntry = {
      gpu: null,
      refCount: 0,
      ready: import("vgpu").then(({ init }) => init()),
    };
    entry.ready = entry.ready.then(
      (gpu) => {
        entry.gpu = gpu;
        return gpu;
      },
      (error) => {
        if (pool === entry) pool = null;
        throw error;
      }
    );
    pool = entry;
  }

  const entry = pool;
  entry.refCount++;
  const gpu = await entry.ready;
  let released = false;
  return {
    gpu,
    ready: entry.ready,
    release: () => {
      if (released) return;
      released = true;
      releaseEntry(entry);
    },
  };
}

function releaseEntry(entry: PoolEntry): void {
  if (entry.refCount <= 0) return;
  entry.refCount--;
  if (entry.refCount === 0) {
    if (pool === entry) pool = null;
    if (entry.gpu) entry.gpu.dispose();
    else
      void entry.ready.then(
        (gpu) => gpu.dispose(),
        () => {}
      );
  }
}

/**
 * Release a GPU device reference. Decrements ref count.
 * When refCount reaches 0, disposes the device.
 */
export function releaseGPU(): void {
  if (pool) releaseEntry(pool);
}

/**
 * Get the current pool state (for debugging/monitoring).
 */
export function getPoolState() {
  return pool ? { refCount: pool.refCount, active: true } : { refCount: 0, active: false };
}
