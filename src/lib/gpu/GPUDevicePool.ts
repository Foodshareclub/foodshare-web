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
  gpu: Gpu;
  refCount: number;
  ready: Promise<Gpu>;
}

let pool: PoolEntry | null = null;

export interface SharedGPU {
  gpu: Gpu;
  ready: Promise<Gpu>;
}

/**
 * Acquire a shared GPU device. Increments ref count.
 * First caller triggers init(); subsequent callers reuse the same device.
 */
export async function acquireGPU(): Promise<SharedGPU> {
  if (pool) {
    pool.refCount++;
    return { gpu: pool.gpu, ready: pool.ready };
  }

  const { init } = await import("vgpu");
  const gpu = await init();
  const ready = Promise.resolve(gpu);

  pool = { gpu, refCount: 1, ready };
  return { gpu, ready };
}

/**
 * Release a GPU device reference. Decrements ref count.
 * When refCount reaches 0, disposes the device.
 */
export function releaseGPU(): void {
  if (!pool) return;

  pool.refCount--;
  if (pool.refCount <= 0) {
    pool.gpu.dispose();
    pool = null;
  }
}

/**
 * Get the current pool state (for debugging/monitoring).
 */
export function getPoolState() {
  return pool ? { refCount: pool.refCount, active: true } : { refCount: 0, active: false };
}
