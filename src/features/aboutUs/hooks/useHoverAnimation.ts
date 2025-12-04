/**
 * Custom hook for hover animations
 * Manages hover state and provides animation variants
 */

import { useState, useCallback } from "react";

interface HoverAnimationConfig {
  scale?: number;
  rotate?: number;
  translateY?: number;
}

export const useHoverAnimation = (config: HoverAnimationConfig = {}) => {
  const { scale = 1.05, rotate = 0, translateY = -4 } = config;
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const hoverProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };

  const animationVariants = {
    rest: {
      scale: 1,
      rotate: 0,
      y: 0,
    },
    hover: {
      scale,
      rotate,
      y: translateY,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 20,
      },
    },
  };

  return {
    isHovered,
    hoverProps,
    animationVariants,
  };
};

export default useHoverAnimation;
