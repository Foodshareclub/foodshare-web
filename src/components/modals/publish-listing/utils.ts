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
 * Compress image to reduce file size
 * Includes timeout to prevent hanging on problematic images
 */
export const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  const COMPRESSION_TIMEOUT_MS = 10000; // 10 second timeout

  return new Promise((resolve) => {
    let resolved = false;
    let objectUrl: string | null = null;

    // Timeout fallback - return original file if compression takes too long
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        console.warn("[compressImage] Compression timed out, using original file");
        resolve(file);
      }
    }, COMPRESSION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      if (resolved) return;

      let { width, height } = img;
      const maxDimension = 1024; // Reduced from 1200 for faster uploads on free tier

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      let quality = 0.8;
      const tryCompress = () => {
        if (resolved) return;

        canvas.toBlob(
          (blob) => {
            if (resolved) return;

            if (blob) {
              const sizeMB = blob.size / (1024 * 1024);
              if (sizeMB > maxSizeMB && quality > 0.3) {
                quality -= 0.1;
                tryCompress();
              } else {
                resolved = true;
                cleanup();
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            } else {
              resolved = true;
              cleanup();
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryCompress();
    };

    img.onerror = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(file);
    };

    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
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
