// Hero Deck Configuration - Enhanced for dramatic effect
export const HERO_DECK_CONFIG = {
  VISIBLE_CARDS: 5,
  OFFSET_Y: 10,
  OFFSET_X: 6,
  SCALE_REDUCTION: 0.035,
  ROTATION_VARIANCE: 4,
  OPACITY_REDUCTION: 0.12,
  // 3D perspective settings
  PERSPECTIVE: 1200,
  TILT_AMOUNT: 8,
  // Particle settings
  PARTICLE_COUNT: 12,
  SHUFFLE_SPREAD: 150,
} as const;

export const ANIMATION_DURATIONS = {
  SHUFFLE: 900,
  CARD_REVEAL: 500,
  ENTRY: 700,
  HOVER: 250,
  FLOAT: 4000,
  GLOW_PULSE: 3000,
} as const;

export const DIFFICULTY_CONFIG = {
  Easy: {
    color: "bg-green-500/90",
    borderColor: "border-green-400/50",
    textColor: "text-green-400",
    xp: 10,
  },
  Medium: {
    color: "bg-yellow-500/90",
    borderColor: "border-yellow-400/50",
    textColor: "text-yellow-400",
    xp: 25,
  },
  Hard: {
    color: "bg-red-500/90",
    borderColor: "border-red-400/50",
    textColor: "text-red-400",
    xp: 50,
  },
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_CONFIG;
