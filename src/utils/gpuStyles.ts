/**
 * GPU-accelerated style utilities
 * These styles force browser to use GPU compositing for better performance
 */

export const gpuAcceleratedStyle = {
  transform: "translateZ(0)",
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  willChange: "transform, opacity",
};

export const gpuTransform = {
  transform: "translateZ(0)",
  willChange: "transform",
};

export const gpuAnimation = {
  transform: "translateZ(0)",
  willChange: "transform, opacity",
  transition: "transform 0.3s ease, opacity 0.3s ease",
};

/**
 * Apply to elements that will animate on hover
 */
export const gpuHoverScale = {
  transform: "translateZ(0)",
  transition: "transform 0.3s ease",
  _hover: {
    transform: "scale(1.05) translateZ(0)",
  },
};

/**
 * Apply to scrollable containers for smooth scrolling
 */
export const gpuScroll = {
  transform: "translateZ(0)",
  WebkitOverflowScrolling: "touch" as const,
  willChange: "scroll-position",
};

/**
 * Apply to images for optimized loading and rendering
 */
export const gpuImage = {
  transform: "translateZ(0)",
  willChange: "transform",
  loading: "lazy" as const,
  decoding: "async" as const,
};

// ============================================
// 120FPS ULTRA-OPTIMIZED STYLES
// ============================================

/**
 * 120fps: Ultra-fast animations with cubic-bezier easing
 * Optimized for high refresh rate displays (120Hz, 144Hz, 240Hz)
 */
export const gpu120Animation = {
  transform: "translate3d(0, 0, 0)", // Force 3D acceleration
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  willChange: "transform, opacity",
  transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease-out",
};

/**
 * 120fps: Instant hover response with hardware acceleration
 */
export const gpu120Hover = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  willChange: "transform, opacity",
  transition: "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)",
  _hover: {
    transform: "scale(1.05) translate3d(0, 0, 0)",
  },
};

/**
 * 120fps: Buttery smooth scrolling
 */
export const gpu120Scroll = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  WebkitOverflowScrolling: "touch" as const,
  willChange: "scroll-position, transform",
  scrollBehavior: "smooth" as const,
};

/**
 * 120fps: Ultra-responsive interactive elements
 */
export const gpu120Interactive = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  willChange: "transform",
  transition: "transform 0.08s cubic-bezier(0.4, 0, 0.2, 1)",
  _active: {
    transform: "scale(0.98) translate3d(0, 0, 0)",
  },
};

/**
 * 120fps: Optimized for continuous animations (loading spinners, etc)
 */
export const gpu120Continuous = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  willChange: "transform",
  animationTimingFunction: "linear",
};

/**
 * 120fps: Layer promotion for complex compositing
 * Use sparingly - creates new compositing layer
 */
export const gpu120Layer = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  perspective: 1000,
  isolation: "isolate" as const,
  willChange: "transform, opacity",
  contain: "layout style paint" as const,
};

/**
 * 120fps: Optimized card animations
 */
export const gpu120Card = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  willChange: "transform, box-shadow",
  transition:
    "transform 0.12s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
  _hover: {
    transform: "translateY(-4px) translate3d(0, 0, 0)",
  },
};

/**
 * 120fps: Fade animations
 */
export const gpu120Fade = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  willChange: "opacity",
  transition: "opacity 0.15s ease-out",
};

/**
 * 120fps: Slide animations
 */
export const gpu120Slide = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  willChange: "transform",
  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
};

/**
 * 120fps: Scale animations
 */
export const gpu120Scale = {
  transform: "translate3d(0, 0, 0) scale(1)",
  backfaceVisibility: "hidden" as const,
  willChange: "transform",
  transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)", // Bouncy easing
};

/**
 * 120fps: Image optimization with instant decode
 */
export const gpu120Image = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  willChange: "transform",
  loading: "lazy" as const,
  decoding: "async" as const,
  imageRendering: "crisp-edges" as const,
};

/**
 * 120fps: Text rendering optimization
 */
export const gpu120Text = {
  transform: "translate3d(0, 0, 0)",
  backfaceVisibility: "hidden" as const,
  WebkitFontSmoothing: "antialiased" as const,
  MozOsxFontSmoothing: "grayscale" as const,
  textRendering: "optimizeLegibility" as const,
};
