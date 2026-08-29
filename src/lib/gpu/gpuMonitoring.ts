"use client";

/**
 * GPU Error Sentry Integration
 * Captures shader compilation failures, device losses, and vgpu runtime errors
 * and reports them to Sentry with rich context.
 */

import * as Sentry from "@sentry/nextjs";

interface GPUErrorContext {
  component: string;
  shader?: string;
  deviceLost?: boolean;
  browser?: string;
  gpu?: string;
}

/**
 * Report a GPU error to Sentry with context.
 * Called by GPUErrorBoundary and GPU component catch blocks.
 */
export function reportGPUError(error: Error, context: GPUErrorContext) {
  Sentry.withScope((scope) => {
    scope.setTag("error.source", "gpu");
    scope.setTag("gpu.component", context.component);
    if (context.shader) scope.setTag("gpu.shader", context.shader);
    if (context.deviceLost) scope.setTag("gpu.deviceLost", "true");

    scope.setExtras({
      gpuBrowser: context.browser,
      gpuAdapter: context.gpu,
      errorMessage: error.message,
      errorStack: error.stack,
    });

    // Classify GPU errors for better alerting
    if (error.message.includes("device lost")) {
      scope.setLevel("warning");
    } else if (error.message.includes("validation")) {
      scope.setLevel("error");
    } else {
      scope.setLevel("error");
    }

    Sentry.captureException(error);
  });
}

/**
 * Report a GPU performance degradation event.
 */
export function reportGPUPerformanceIssue(metrics: {
  fps: number;
  frameTime: number;
  component: string;
}) {
  Sentry.withScope((scope) => {
    scope.setTag("error.source", "gpu-performance");
    scope.setTag("gpu.component", metrics.component);
    scope.setLevel("warning");
    scope.setExtras({
      fps: metrics.fps,
      frameTime: metrics.frameTime,
    });
    Sentry.captureMessage(`GPU performance degraded: ${metrics.fps}fps in ${metrics.component}`);
  });
}

/**
 * Initialize GPU error monitoring.
 * Call once at app startup.
 */
export function initGPUMonitoring() {
  if (typeof navigator === "undefined") return;

  const gpu = (navigator as any).gpu;
  if (!gpu) return;

  // Listen for uncaptured GPU errors
  gpu.addEventListener?.("uncapturederror", (event: any) => {
    reportGPUError(new Error(event.error?.message || "Uncaptured GPU error"), {
      component: "global",
      shader: event.error?.shaderModule?.label,
    });
  });
}
