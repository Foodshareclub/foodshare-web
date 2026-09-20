"use client";

import { useDecorativeShader } from "@/lib/gpu/useDecorativeShader";
import { cn } from "@/lib/utils";
import styles from "./FloatingOrbs.module.css";

const loadShader = () => import("./FloatingOrbs.wgsl");

interface FloatingOrbsProps {
  className?: string;
  scroll?: number;
  opacity?: number;
}

/** One optional vgpu canvas with a static, theme-aware fallback beneath it. */
export function FloatingOrbs({ className, scroll = 0, opacity = 1 }: FloatingOrbsProps) {
  const { canvasRef, ready } = useDecorativeShader(loadShader, "FloatingOrbs", scroll);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
      style={{ opacity }}
    >
      <div data-gpu-fallback="orbs" className={cn("absolute inset-0", styles.fallback)} hidden={ready} />
      <canvas
        ref={canvasRef}
        data-gpu-effect="orbs"
        data-gpu-ready={ready}
        className="absolute inset-0 size-full"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
