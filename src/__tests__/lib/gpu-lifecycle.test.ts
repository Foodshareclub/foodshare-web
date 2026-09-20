import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import type { Gpu } from "vgpu";

function device() {
  return { dispose: mock(() => {}) } as unknown as Gpu;
}

let initialize: () => Promise<Gpu>;
const init = mock(() => initialize());
let createSurface = () => ({ dispose: mock(() => {}) });
const surface = mock(() => createSurface());
mock.module("vgpu", () => ({ init, surface }));

const { acquireGPU, getPoolState, releaseGPU } = await import("@/lib/gpu/GPUDevicePool");
const { initGPURender } = await import("@/lib/gpu/useGPURender");

beforeEach(() => {
  initialize = async () => device();
  createSurface = () => ({ dispose: mock(() => {}) });
  init.mockClear();
  surface.mockClear();
});
afterEach(() => {
  while (getPoolState().refCount) releaseGPU();
});

test("concurrent canvases share pending initialization and retain the device until the final release", async () => {
  const pending = Promise.withResolvers<Gpu>();
  initialize = () => pending.promise;
  const first = acquireGPU();
  const second = acquireGPU();
  const gpu = device();
  pending.resolve(gpu);
  const [a, b] = await Promise.all([first, second]);
  expect(init).toHaveBeenCalledTimes(1);
  expect(a.gpu).toBe(b.gpu);
  a.release();
  a.release();
  expect(getPoolState().refCount).toBe(1);
  expect(gpu.dispose).not.toHaveBeenCalled();
  b.release();
  expect(gpu.dispose).toHaveBeenCalledTimes(1);
  expect(getPoolState().active).toBe(false);
});

test("an adapter failure rejects all waiting canvases and permits a later retry", async () => {
  initialize = () => Promise.reject(new Error("Adapter unavailable"));
  const attempts = await Promise.allSettled([acquireGPU(), acquireGPU()]);
  expect(attempts.every((attempt) => attempt.status === "rejected")).toBe(true);
  expect(init).toHaveBeenCalledTimes(1);
  expect(getPoolState().active).toBe(false);
  initialize = async () => device();
  const retry = await acquireGPU();
  expect(getPoolState().refCount).toBe(1);
  retry.release();
});

test("a failed surface releases its own acquisition while preserving another canvas", async () => {
  const existing = await acquireGPU();
  createSurface = () => {
    throw new Error("Canvas unavailable");
  };
  await expect(initGPURender({ canvasRef: { current: document.createElement("canvas") } })).rejects.toThrow(
    "Canvas unavailable",
  );
  expect(getPoolState().refCount).toBe(1);
  expect(existing.gpu.dispose).not.toHaveBeenCalled();
  existing.release();
});

test("a canvas detached during initialization is never claimed", async () => {
  const pending = Promise.withResolvers<Gpu>();
  initialize = () => pending.promise;
  const canvasRef: { current: HTMLCanvasElement | null } = { current: document.createElement("canvas") };
  const rendering = initGPURender({ canvasRef });
  canvasRef.current = null;
  const gpu = device();
  pending.resolve(gpu);
  await expect(rendering).rejects.toThrow("canvas detached");
  expect(surface).not.toHaveBeenCalled();
  expect(gpu.dispose).toHaveBeenCalledTimes(1);
});

test("cancellation prevents Strict Mode's obsolete initialization from claiming a reused canvas", async () => {
  const pending = Promise.withResolvers<Gpu>();
  initialize = () => pending.promise;
  const canvasRef = { current: document.createElement("canvas") };
  const controller = new AbortController();
  const obsolete = initGPURender({ canvasRef, signal: controller.signal });
  controller.abort();
  const active = initGPURender({ canvasRef });
  pending.resolve(device());
  const results = await Promise.allSettled([obsolete, active]);
  expect(results[0].status).toBe("rejected");
  expect(results[1].status).toBe("fulfilled");
  expect(surface).toHaveBeenCalledTimes(1);
  if (results[1].status === "fulfilled") results[1].value.dispose();
  expect(getPoolState().refCount).toBe(0);
});

test("teardown releases every listener and the surface once, even when a listener throws", async () => {
  const resource = { dispose: mock(() => {}) };
  createSurface = () => resource;
  const existing = await acquireGPU();
  const render = await initGPURender({ canvasRef: { current: document.createElement("canvas") } });
  const cleanup = mock(() => {});
  render.onCleanup(() => {
    throw new Error("Listener failed");
  });
  render.onCleanup(cleanup);
  render.dispose();
  render.dispose();
  expect(cleanup).toHaveBeenCalledTimes(1);
  expect(resource.dispose).toHaveBeenCalledTimes(1);
  expect(existing.gpu.dispose).not.toHaveBeenCalled();
  const lateCleanup = mock(() => {});
  render.onCleanup(lateCleanup);
  expect(lateCleanup).toHaveBeenCalledTimes(1);
  existing.release();
  expect(existing.gpu.dispose).toHaveBeenCalledTimes(1);
});
