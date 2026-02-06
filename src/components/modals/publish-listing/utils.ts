import type { HistoryReducerState, HistoryAction } from "./types";

/**
 * History reducer for undo/redo functionality
 */
export const historyReducer = (
  state: HistoryReducerState,
  action: HistoryAction
): HistoryReducerState => {
  switch (action.type) {
    case "SET":
      if (
        state.present.title === action.payload.title &&
        state.present.description === action.payload.description
      ) {
        return state;
      }
      return {
        past: [...state.past, state.present].slice(-20),
        present: action.payload,
        future: [],
      };
    case "UNDO":
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case "REDO":
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    case "CLEAR":
      return {
        past: [],
        present: { title: "", description: "" },
        future: [],
      };
    default:
      return state;
  }
};

/**
 * Generate confetti particles for celebration animation
 */
export const generateConfettiParticles = () => {
  const colors = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8"];
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: Math.random() * 8 + 4,
    duration: Math.random() * 1 + 1.5,
    isRound: Math.random() > 0.5,
  }));
};

/**
 * Calculate listing quality score
 */
export const calculateQualityScore = (
  title: string,
  description: string,
  images: unknown[],
  tags: string[],
  minTitleLength: number,
  minDescriptionLength: number
): { score: number; suggestions: string[] } => {
  let score = 0;
  const suggestions: string[] = [];

  // Title (25 points)
  if (title.length >= minTitleLength) {
    score += 10;
    if (title.length >= 10) score += 10;
    if (title.length >= 20) score += 5;
  } else {
    suggestions.push("Add a descriptive title (at least 3 characters)");
  }

  // Description (35 points)
  if (description.length >= minDescriptionLength) {
    score += 15;
    if (description.length >= 50) score += 10;
    if (description.length >= 100) score += 10;
  } else {
    suggestions.push("Add a detailed description (at least 20 characters)");
  }

  // Images (25 points)
  if (images.length > 0) {
    score += 10;
    if (images.length >= 2) score += 10;
    if (images.length >= 3) score += 5;
  } else {
    suggestions.push("Add at least one image to attract more interest");
  }

  // Tags (15 points)
  if (tags.length > 0) {
    score += 5;
    if (tags.length >= 2) score += 5;
    if (tags.length >= 3) score += 5;
  } else {
    suggestions.push("Add tags to help others find your listing");
  }

  return { score, suggestions };
};
