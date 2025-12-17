import { Variants } from "framer-motion";
import { DECK_CONFIG, ANIMATION_DURATIONS, SWIPE_CONFIG } from "./constants";

// Modal entrance/exit animations
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// Subtle idle animation for the deck
export const deckIdleVariants: Variants = {
  idle: {
    rotateZ: [0, -0.5, 0.5, 0],
    y: [0, -2, 0],
    transition: {
      duration: ANIMATION_DURATIONS.IDLE_CYCLE,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Dramatic shuffle animation
export const shuffleVariants: Variants = {
  initial: {
    rotateZ: 0,
    x: 0,
    y: 0,
  },
  shuffle: {
    rotateZ: [0, -15, 15, -10, 10, -5, 5, 0],
    x: [0, -30, 30, -20, 20, -10, 10, 0],
    y: [0, -20, 0, -15, 0, -10, 0, 0],
    transition: {
      duration: ANIMATION_DURATIONS.SHUFFLE / 1000,
      times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
      ease: "easeInOut",
    },
  },
};

// Individual card shuffle fly animation
export const shuffleFlyVariants = (index: number): Variants => ({
  initial: {
    x: 0,
    y: 0,
    rotateZ: index * DECK_CONFIG.ROTATION_VARIANCE,
    scale: 1 - index * DECK_CONFIG.SCALE_REDUCTION,
  },
  fly: {
    x: [0, (index % 2 === 0 ? -1 : 1) * (80 + index * 20), 0],
    y: [0, -40 - index * 15, 0],
    rotateZ: [
      index * DECK_CONFIG.ROTATION_VARIANCE,
      (index % 2 === 0 ? -1 : 1) * (15 + index * 3),
      index * DECK_CONFIG.ROTATION_VARIANCE,
    ],
    scale: [1 - index * DECK_CONFIG.SCALE_REDUCTION, 1.05, 1 - index * DECK_CONFIG.SCALE_REDUCTION],
    transition: {
      duration: 0.5,
      delay: index * 0.03,
      ease: [0.4, 0, 0.2, 1],
    },
  },
});

// Stacked card positioning based on index
export const stackCardVariants = (index: number): Variants => ({
  stacked: {
    y: index * DECK_CONFIG.OFFSET_Y,
    x: index * DECK_CONFIG.OFFSET_X,
    scale: 1 - index * DECK_CONFIG.SCALE_REDUCTION,
    rotateZ: index * DECK_CONFIG.ROTATION_VARIANCE,
    opacity: 1 - index * DECK_CONFIG.OPACITY_REDUCTION,
    zIndex: 10 - index,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
});

// Swipe exit animation (card flies off screen)
export const swipeExitVariants: Variants = {
  exitLeft: {
    x: -SWIPE_CONFIG.EXIT_DISTANCE,
    y: -100,
    rotate: -SWIPE_CONFIG.EXIT_ROTATION,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATIONS.SWIPE_EXIT / 1000,
      ease: [0.4, 0, 1, 1],
    },
  },
  exitRight: {
    x: SWIPE_CONFIG.EXIT_DISTANCE,
    y: -100,
    rotate: SWIPE_CONFIG.EXIT_ROTATION,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATIONS.SWIPE_EXIT / 1000,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Next card slides up from stack
export const nextCardVariants: Variants = {
  hidden: {
    scale: 1 - DECK_CONFIG.SCALE_REDUCTION,
    y: DECK_CONFIG.OFFSET_Y,
    x: DECK_CONFIG.OFFSET_X,
    opacity: 0.8,
  },
  visible: {
    scale: 1,
    y: 0,
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
      delay: 0.1,
    },
  },
};

// Swipe indicator fade animations
export const indicatorVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 },
  },
};

// Card back to front flip
export const cardFlipVariants: Variants = {
  front: {
    rotateY: 0,
    transition: {
      duration: ANIMATION_DURATIONS.FLIP / 1000,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  back: {
    rotateY: 180,
    transition: {
      duration: ANIMATION_DURATIONS.FLIP / 1000,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

// Spring configuration for snap back
export const snapBackSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
};

// Button hover/tap animations
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
};

// Empty state animation
export const emptyStateVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

// Confetti burst for accept
export const confettiBurstVariants: Variants = {
  initial: { scale: 0, opacity: 0 },
  burst: {
    scale: [0, 1.2, 1],
    opacity: [0, 1, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.3, 1],
    },
  },
};
