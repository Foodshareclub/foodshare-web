"use client";

import { useDecorativeShader } from "@/lib/gpu/useDecorativeShader";
import { cn } from "@/lib/utils";

const loadShader = () => import("./GradientBackground.wgsl");

interface GradientBackgroundProps {
  className?: string;
  scroll?: number;
}

export function GradientBackground({ className, scroll = 0 }: GradientBackgroundProps) {
  const { canvasRef, ready } = useDecorativeShader(loadShader, "GradientBackground", scroll);

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 -z-10", className)}>
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" hidden={ready} />
      <canvas
        ref={canvasRef}
        data-gpu-effect="gradient"
        data-gpu-ready={ready}
        className="absolute inset-0 size-full"
        style={{ opacity: ready ? 1 : 0 }}
      />
    </div>
  );
}
