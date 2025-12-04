/**
 * Animation variants and configurations for About Us page
 * Centralized animation definitions for consistency and maintainability
 */

import { Variants } from "framer-motion";

// Fade and slide animations
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.6, -0.05, 0.01, 0.99],
    },
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 100,
    },
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 100,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

// Stagger container variants
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// Image hover effects
export const imageHover = {
  rest: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.08,
    rotate: [0, -2, 2, -1, 1, 0],
  },
};

// Floating animation
export const floatingAnimation = {
  animate: {
    y: [0, -20, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
  },
};

// Gradient shift keyframes
export const gradientShiftKeyframes = {
  "0%, 100%": { backgroundPosition: "0% 50%" },
  "50%": { backgroundPosition: "100% 50%" },
};

// Card 3D tilt effect
export const card3DTilt = {
  rest: { rotateY: 0, rotateX: 0 },
  hover: {
    rotateY: 5,
    rotateX: 5,
  },
};

// Shimmer effect animation
export const shimmerAnimation = {
  animate: {
    x: ["-100%", "200%"],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
  },
};

// Pulse animation
export const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
  },
};

// Particle animations
export const particleVariants = (delay: number) => ({
  animate: {
    x: [0, Math.random() * 40 - 20, 0],
    y: [0, Math.random() * 40 - 20, 0],
    scale: [1, 1.5, 1],
    opacity: [0.3, 0.8, 0.3],
  },
  transition: {
    duration: 3 + delay,
    repeat: Infinity,
  },
});

// Orb floating animation
export const orbAnimation = (duration: number) => ({
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

export default fadeInUp;
