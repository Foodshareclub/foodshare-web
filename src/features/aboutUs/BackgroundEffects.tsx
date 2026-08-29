/**
 * Background effects components for About Us page
 * GPU-accelerated animated background elements with Framer Motion fallback
 */

"use client";

import React from "react";
import { useScroll, useTransform, useSpring } from "framer-motion";
import { MotionBox } from "./MotionComponents";
import { useGPUContext, GPUErrorBoundary } from "@/lib/gpu";
import { FloatingOrbs as GPUFloatingOrbs } from "@/components/gpu/FloatingOrbs";
import { GradientBackground as GPUGradientBackground } from "@/components/gpu/GradientBackground";

export const AnimatedGradientBackground: React.FC = () => {
  const { supported } = useGPUContext();
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const smoothY = useSpring(y, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // GPU path: single fragment shader replaces CSS gradient animation
  if (supported) {
    return (
      <GPUErrorBoundary>
        <GPUGradientBackground className="-z-10" />
      </GPUErrorBoundary>
    );
  }

  // Fallback: original Framer Motion implementation
  return (
    <MotionBox
      className="absolute top-0 left-0 right-0 bottom-0 -z-10"
      style={{
        y: smoothY,
        background:
          "linear-gradient(135deg, rgba(255,69,0,0.03) 0%, rgba(255,165,0,0.03) 50%, rgba(255,69,0,0.03) 100%)",
        backgroundSize: "400% 400%",
        animation: "gradientFlow 15s ease infinite",
        willChange: "transform",
      }}
    />
  );
};

export const FloatingOrbs: React.FC = () => {
  const { supported } = useGPUContext();

  // GPU path: single fullscreen shader replaces 5 Framer Motion blur circles
  if (supported) {
    return (
      <GPUErrorBoundary>
        <GPUFloatingOrbs className="-z-10" />
      </GPUErrorBoundary>
    );
  }

  // Fallback: original Framer Motion implementation
  const ORB_POSITIONS = [
    { top: 15, left: 72 },
    { top: 48, left: 23 },
    { top: 78, left: 85 },
    { top: 32, left: 45 },
    { top: 65, left: 10 },
  ];

  const orbAnimation = (duration: number) => ({
    animate: {
      x: [0, Math.random() * 100 - 50, 0],
      y: [0, Math.random() * 100 - 50, 0],
      scale: [1, 1.2, 1],
    },
    transition: {
      duration,
      repeat: Infinity,
    },
  });

  return (
    <>
      {ORB_POSITIONS.map((pos, i) => (
        <MotionBox
          key={i}
          className="absolute rounded-full -z-10 blur-[40px]"
          {...orbAnimation(10 + i * 2)}
          style={{
            width: `${200 + i * 50}px`,
            height: `${200 + i * 50}px`,
            top: `${pos.top}%`,
            left: `${pos.left}%`,
            background: `radial-gradient(circle, rgba(255,${99 + i * 10},71,0.15) 0%, transparent 70%)`,
            willChange: "transform",
          }}
        />
      ))}
    </>
  );
};

interface GlowEffectProps {
  isHovered: boolean;
  size?: { base: string; sm: string };
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  isHovered,
  size = { base: "180px", sm: "220px" },
}) => {
  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[20px] z-0 transition-opacity duration-400 pointer-events-none"
      style={{
        width: size.base,
        height: size.base,
        background: "radial-gradient(circle, rgba(255,99,71,0.4) 0%, transparent 70%)",
        opacity: isHovered ? 1 : 0,
      }}
    />
  );
};

export default AnimatedGradientBackground;
