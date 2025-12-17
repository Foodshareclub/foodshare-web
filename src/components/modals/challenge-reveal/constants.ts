// Swipe gesture configuration
export const SWIPE_CONFIG = {
  /** Minimum distance (px) to trigger a swipe */
  THRESHOLD: 150,
  /** Minimum velocity to trigger a swipe */
  VELOCITY_THRESHOLD: 500,
  /** Drag elasticity (0-1, higher = more springy) */
  DRAG_ELASTIC: 0.9,
  /** Maximum rotation during drag (degrees) */
  MAX_ROTATION: 25,
  /** Exit animation distance */
  EXIT_DISTANCE: 500,
  /** Exit animation rotation */
  EXIT_ROTATION: 30,
} as const;

// Deck visual configuration
export const DECK_CONFIG = {
  /** Number of cards visible in stack */
  VISIBLE_CARDS: 3,
  /** Vertical offset per card (px) */
  OFFSET_Y: 6,
  /** Horizontal offset per card (px) */
  OFFSET_X: 3,
  /** Scale reduction per card (0-1) */
  SCALE_REDUCTION: 0.03,
  /** Rotation variance per card (degrees) */
  ROTATION_VARIANCE: 2,
  /** Opacity reduction per card */
  OPACITY_REDUCTION: 0.2,
} as const;

// Animation timing
export const ANIMATION_DURATIONS = {
  /** Shuffle animation duration (ms) */
  SHUFFLE: 800,
  /** Swipe exit animation (ms) */
  SWIPE_EXIT: 300,
  /** Card flip duration (ms) */
  FLIP: 600,
  /** Snap back to center (ms) */
  SNAP_BACK: 250,
  /** Next card slide in (ms) */
  NEXT_CARD: 400,
  /** Idle animation cycle (s) */
  IDLE_CYCLE: 3,
} as const;

// Difficulty configuration (matches ChallengesClient)
export const DIFFICULTY_CONFIG = {
  Easy: {
    color: "bg-green-500",
    textColor: "text-green-500",
    borderColor: "border-green-500/30",
    xp: 10,
  },
  Medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    borderColor: "border-yellow-500/30",
    xp: 25,
  },
  Hard: {
    color: "bg-red-500",
    textColor: "text-red-500",
    borderColor: "border-red-500/30",
    xp: 50,
  },
} as const;

// Card dimensions
export const CARD_DIMENSIONS = {
  WIDTH: 288, // w-72 = 18rem = 288px
  ASPECT_RATIO: 3 / 4,
  IMAGE_HEIGHT: 192, // h-48 = 12rem = 192px
} as const;
