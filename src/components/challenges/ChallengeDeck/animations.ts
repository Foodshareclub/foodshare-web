import { Variants } from "framer-motion";
import { HERO_DECK_CONFIG, ANIMATION_DURATIONS } from "./constants";

/**
 * GPU-Optimized Animation Variants
 *
 * All animations use only GPU-accelerated properties:
 * - transform (translate, rotate, scale)
 * - opacity
 *
 * This ensures 60fps performance by keeping animations
 * on the compositor thread, avoiding layout/paint triggers.
 */

// Hero deck entrance animation - GPU accelerated 3D transforms
export const heroEntryVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 80,
    scale: 0.8,
    rotateX: 25,
    rotateY: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 18,
      delay: 0.3,
    },
  },
};

// Stacked card positioning with enhanced 3D depth
export const stackCardVariants = (index: number): Variants => ({
  stacked: {
    y: index * HERO_DECK_CONFIG.OFFSET_Y,
    x: index * HERO_DECK_CONFIG.OFFSET_X,
    scale: 1 - index * HERO_DECK_CONFIG.SCALE_REDUCTION,
    rotateZ: index * HERO_DECK_CONFIG.ROTATION_VARIANCE,
    rotateX: index * 1.5, // Subtle 3D tilt
    opacity: 1 - index * HERO_DECK_CONFIG.OPACITY_REDUCTION,
    zIndex: 10 - index,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 28,
    },
  },
});

// Dramatic shuffle animation for the entire deck
export const shuffleDeckVariants: Variants = {
  idle: {
    rotateZ: 0,
    rotateY: 0,
    x: 0,
    y: 0,
  },
  shuffle: {
    rotateZ: [0, -15, 15, -10, 10, -5, 5, 0],
    rotateY: [0, 8, -8, 5, -5, 2, -2, 0],
    x: [0, -30, 30, -20, 20, -10, 10, 0],
    y: [0, -20, 5, -15, 5, -8, 0, 0],
    transition: {
      duration: ANIMATION_DURATIONS.SHUFFLE / 1000,
      times: [0, 0.12, 0.28, 0.42, 0.58, 0.72, 0.88, 1],
      ease: "easeInOut",
    },
  },
};

// Individual card fly animation during shuffle - More dramatic spread
export const shuffleFlyVariants = (index: number): Variants => ({
  idle: {
    x: index * HERO_DECK_CONFIG.OFFSET_X,
    y: index * HERO_DECK_CONFIG.OFFSET_Y,
    rotateZ: index * HERO_DECK_CONFIG.ROTATION_VARIANCE,
    rotateY: 0,
    scale: 1 - index * HERO_DECK_CONFIG.SCALE_REDUCTION,
  },
  fly: {
    x: [
      index * HERO_DECK_CONFIG.OFFSET_X,
      (index % 2 === 0 ? -1 : 1) * (HERO_DECK_CONFIG.SHUFFLE_SPREAD + index * 30),
      index * HERO_DECK_CONFIG.OFFSET_X,
    ],
    y: [index * HERO_DECK_CONFIG.OFFSET_Y, -80 - index * 25, index * HERO_DECK_CONFIG.OFFSET_Y],
    rotateZ: [
      index * HERO_DECK_CONFIG.ROTATION_VARIANCE,
      (index % 2 === 0 ? -1 : 1) * (30 + index * 8),
      index * HERO_DECK_CONFIG.ROTATION_VARIANCE,
    ],
    rotateY: [0, (index % 2 === 0 ? 1 : -1) * 25, 0],
    scale: [
      1 - index * HERO_DECK_CONFIG.SCALE_REDUCTION,
      1.12,
      1 - index * HERO_DECK_CONFIG.SCALE_REDUCTION,
    ],
    transition: {
      duration: 0.7,
      delay: index * 0.05,
      ease: [0.34, 1.56, 0.64, 1], // Spring-like ease
    },
  },
});

// Enhanced hover float effect with 3D tilt
export const hoverFloatVariants: Variants = {
  idle: {
    y: 0,
    rotateZ: 0,
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  },
  hover: {
    y: -16,
    rotateZ: 2,
    rotateX: -5,
    rotateY: 5,
    scale: 1.04,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 18,
    },
  },
};

// Shuffle button spin animation - More energetic
export const shuffleButtonVariants: Variants = {
  idle: {
    rotate: 0,
    scale: 1,
  },
  spinning: {
    rotate: 720,
    scale: [1, 1.2, 1],
    transition: {
      rotate: {
        duration: 0.8,
        ease: [0.34, 1.56, 0.64, 1],
      },
      scale: {
        duration: 0.4,
        times: [0, 0.5, 1],
      },
    },
  },
  hover: {
    scale: 1.12,
    rotate: 15,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 12,
    },
  },
  tap: {
    scale: 0.92,
    rotate: -15,
  },
};

// Gentle floating idle animation
export const idleWobbleVariants: Variants = {
  idle: {
    rotateZ: [0, -1, 1, -0.5, 0.5, 0],
    y: [0, -4, 0, -2, 0],
    rotateX: [0, 1, 0, -1, 0],
    transition: {
      duration: ANIMATION_DURATIONS.FLOAT / 1000,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Card reveal after shuffle with 3D flip
export const cardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    rotateY: -120,
    scale: 0.85,
    x: -30,
  },
  visible: {
    opacity: 1,
    rotateY: 0,
    scale: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 250,
      damping: 22,
      delay: 0.15,
    },
  },
};

// Particle burst animation for shuffle effect
export const particleBurstVariants = (angle: number, distance: number): Variants => ({
  initial: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  },
  burst: {
    opacity: [1, 1, 0],
    scale: [1, 1.5, 0.5],
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
});

// Glowing pulse animation
export const glowPulseVariants: Variants = {
  idle: {
    opacity: [0.4, 0.7, 0.4],
    scale: [1, 1.08, 1],
    transition: {
      duration: ANIMATION_DURATIONS.GLOW_PULSE / 1000,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Interactive hint bounce - GPU translate only
export const hintBounceVariants: Variants = {
  idle: {
    y: [0, -6, 0],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// GPU-optimized spring config for smooth 60fps
export const gpuSpringConfig = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
  mass: 1,
};

// GPU-optimized tween config
export const gpuTweenConfig = {
  type: "tween" as const,
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const, // ease-out cubic
};

// Shimmer sweep animation - GPU gradient position
export const shimmerVariants: Variants = {
  idle: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Scale pulse for interactive elements - GPU transform only
export const scalePulseVariants: Variants = {
  idle: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// 3D card flip - GPU accelerated
export const cardFlipVariants: Variants = {
  faceUp: {
    rotateY: 0,
    opacity: 1,
    transition: gpuSpringConfig,
  },
  faceDown: {
    rotateY: 180,
    opacity: 0,
    transition: gpuSpringConfig,
  },
};

// Stagger children animation config
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// GPU-optimized fade in for children
export const fadeInChildVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
};
