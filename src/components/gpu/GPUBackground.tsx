"use client";

import React, { type ReactNode } from "react";
import { GPUErrorBoundary } from "@/lib/gpu";
import { FloatingOrbs } from "@/components/gpu/FloatingOrbs";
import { GradientBackground } from "@/components/gpu/GradientBackground";

interface GPUBackgroundProps {
  children: ReactNode;
  /** Show floating orbs */
  orbs?: boolean;
  /** Show animated gradient */
  gradient?: boolean;
  /** Orb opacity (0-1) */
  orbOpacity?: number;
  /** Additional className for the container */
  className?: string;
  /** z-index for the background layer */
  zIndex?: string;
}

/**
 * Reusable GPU background wrapper.
 * Renders animated orbs and gradient behind children.
 * Falls back to CSS on unsupported browsers.
 *
 * Usage:
 * <GPUBackground orbs gradient>
 *   <YourContent />
 * </GPUBackground>
 */
export function GPUBackground({
  children,
  orbs = true,
  gradient = true,
  orbOpacity = 0.4,
  className = "",
  zIndex = "-z-10",
}: GPUBackgroundProps) {
  return (
    <GPUErrorBoundary>
      <div className={`relative ${className}`}>
        {gradient && <GradientBackground className={zIndex} />}
        {orbs && <FloatingOrbs className={zIndex} opacity={orbOpacity} />}
        {children}
      </div>
    </GPUErrorBoundary>
  );
}

/**
 * Simpler variant: just orbs, no gradient.
 * Good for cards and smaller sections.
 */
export function GPUOrbBackground({
  children,
  className = "",
  opacity = 0.3,
}: {
  children: ReactNode;
  className?: string;
  opacity?: number;
}) {
  return (
    <div className={`relative ${className}`}>
      <FloatingOrbs className="-z-10" opacity={opacity} />
      {children}
    </div>
  );
}
