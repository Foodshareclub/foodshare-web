"use client";

import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 20,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(element);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [once]);

  const directionStyles = {
    up: { initial: `translateY(${distance}px)`, final: "translateY(0)" },
    down: { initial: `translateY(-${distance}px)`, final: "translateY(0)" },
    left: { initial: `translateX(${distance}px)`, final: "translateX(0)" },
    right: { initial: `translateX(-${distance}px)`, final: "translateX(0)" },
    none: { initial: "none", final: "none" },
  };

  const { initial, final } = directionStyles[direction];

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isVisible ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{
        transform: isVisible ? final : initial,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
