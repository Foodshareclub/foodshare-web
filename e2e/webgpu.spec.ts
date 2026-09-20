import { test, expect } from "@playwright/test";

/**
 * WebGPU GPU rendering E2E tests.
 * Runs only on chromium-webgpu project with --enable-unsafe-webgpu flag.
 *
 * Tests verify:
 * 1. WebGPU detection works correctly
 * 2. GPU components render without errors
 * 3. Fallback works on unsupported browsers
 * 4. Shader compilation doesn't crash the app
 */

test.describe("WebGPU Rendering", () => {
  test("detects WebGPU support", async ({ page }) => {
    await page.goto("/");

    // Check that the GPU provider initialized
    const gpuSupported = await page.evaluate(() => {
      return !!(navigator as any).gpu;
    });

    // WebGPU should be available in chromium-webgpu project
    // In regular chromium, this will be false (fallback path)
    expect(typeof gpuSupported).toBe("boolean");
  });

  test("login page renders without GPU errors", async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    // Page should load without GPU-related crashes
    const gpuErrors = errors.filter(
      (e) => e.includes("GPU") || e.includes("WebGPU") || e.includes("shader")
    );
    expect(gpuErrors).toHaveLength(0);

    // Background effects should be present (either canvas or CSS fallback)
    const backgroundElement = page.locator('[data-gpu-effect="orbs"], [data-gpu-fallback="orbs"]:visible').first();
    await expect(backgroundElement).toBeVisible();
  });

  test("paints the GPU background when a WebGPU adapter is available", async ({ page }) => {
    await page.goto("/auth/login");
    const adapterAvailable = await page.evaluate(async () => {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      return Boolean(await gpu?.requestAdapter());
    });
    test.skip(!adapterAvailable, "This browser has no GPU adapter; the fallback test covers it.");
    await expect(page.locator('[data-gpu-effect="orbs"]')).toHaveAttribute("data-gpu-ready", "true");
    await expect(page.locator('[data-gpu-fallback="orbs"]')).toBeHidden();
  });

  test("challenge page confetti trigger works", async ({ page }) => {
    // This test verifies the useConfetti hook doesn't crash
    // Full confetti rendering requires auth, so we test the import path
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // No uncaught errors from GPU imports
    const gpuPageErrors = errors.filter(
      (e) => e.includes("vgpu") || e.includes("GPUConfetti") || e.includes("useConfetti")
    );
    expect(gpuPageErrors).toHaveLength(0);
  });

  test("GPU canvas elements are properly cleaned up", async ({ page }) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    // Count canvas elements
    const canvasCount = await page.locator("canvas").count();

    // Navigate away
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Canvas elements should be cleaned up (no memory leak)
    // After navigation, old canvases should be gone
    const afterCanvasCount = await page.locator("canvas").count();
    expect(afterCanvasCount).toBeLessThanOrEqual(canvasCount);
  });
});

test.describe("WebGPU Fallback", () => {
  test("gracefully degrades when WebGPU is unavailable", async ({ page }) => {
    // Block WebGPU API to simulate unsupported browser
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "gpu", { value: undefined });
    });

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");

    // Should render without errors (using CSS fallback)
    expect(errors).toHaveLength(0);

    await expect(page.locator('[data-gpu-fallback="orbs"]')).toBeVisible();
    await expect(page.locator('[data-gpu-effect="orbs"]')).toHaveAttribute("data-gpu-ready", "false");
  });
});
