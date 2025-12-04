/**
 * Custom hook for scroll-based animations
 * Provides reusable scroll animation logic
 */

import type { MotionValue } from "framer-motion";
import { useScroll, useTransform, useSpring } from "framer-motion";

interface ScrollAnimationConfig {
  enableParallax?: boolean;
  enableScale?: boolean;
  enableOpacity?: boolean;
}

interface ScrollAnimationResult {
  scrollY: MotionValue<number>;
  parallaxY: MotionValue<number>;
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
}

export const useScrollAnimations = (config: ScrollAnimationConfig = {}): ScrollAnimationResult => {
  const { enableParallax = true, enableScale = true, enableOpacity = true } = config;

  const { scrollYProgress } = useScroll();

  // Parallax effect
  const y = useTransform(scrollYProgress, [0, 1], enableParallax ? [0, 30] : [0, 0]);
  const parallaxY = useSpring(y, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Scale effect
  const scale = useTransform(scrollYProgress, [0, 0.5], enableScale ? [1, 0.98] : [1, 1]);

  // Opacity effect
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.3, 1],
    enableOpacity ? [1, 0.9, 0.7] : [1, 1, 1]
  );

  return {
    scrollY: scrollYProgress,
    parallaxY,
    scale,
    opacity,
  };
};

export default useScrollAnimations;
