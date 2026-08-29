"use client";

import React, { createContext, useContext, useEffect, type ReactNode } from "react";
import { useWebGPU, type WebGPUState } from "./useWebGPU";
import { initGPUMonitoring } from "./gpuMonitoring";

const GPUContext = createContext<WebGPUState>({
  supported: false,
  loading: true,
  error: null,
});

export function GPUProvider({ children }: { children: ReactNode }) {
  const state = useWebGPU();

  // Initialize GPU error monitoring once
  useEffect(() => {
    initGPUMonitoring();
  }, []);

  return <GPUContext.Provider value={state}>{children}</GPUContext.Provider>;
}

/**
 * Access WebGPU support state from any client component.
 * Returns { supported: false } during SSR / on server.
 */
export function useGPUContext(): WebGPUState {
  return useContext(GPUContext);
}

/**
 * Higher-order wrapper: renders `gpu` if supported, `fallback` otherwise.
 */
export function withGPU<P extends object>(
  Component: React.ComponentType<P>,
  Fallback: React.ComponentType<P>
) {
  return function GPUGate(props: P) {
    const { supported, loading } = useGPUContext();
    if (loading) return null;
    return supported ? <Component {...props} /> : <Fallback {...props} />;
  };
}
