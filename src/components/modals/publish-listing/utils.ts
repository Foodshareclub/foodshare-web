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
 * Aggressive compression for storage savings on free tier
 * Target: ~200KB per image, max 800px dimension
 */
export const compressImage = async (
  file: File,
  targetSizeKB: number = 200,
  maxDimension: number = 800
): Promise<File> => {
  const COMPRESSION_TIMEOUT_MS = 15000; // 15 second timeout

  return new Promise((resolve) => {
    let resolved = false;
    let objectUrl: string | null = null;

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

      // Aggressive resize - max 800px (saves significant storage)
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      const targetSizeBytes = targetSizeKB * 1024;
      let quality = 0.7; // Start lower for faster compression
      let attempts = 0;
      const maxAttempts = 8;

      const tryCompress = () => {
        if (resolved) return;
        attempts++;

        canvas.toBlob(
          (blob) => {
            if (resolved) return;

            if (blob) {
              const sizeKB = blob.size / 1024;
              console.log(
                `[compressImage] Attempt ${attempts}: ${sizeKB.toFixed(0)}KB @ quality ${quality.toFixed(2)}`
              );

              // Accept if under target or we've tried enough times
              if (blob.size <= targetSizeBytes || quality <= 0.3 || attempts >= maxAttempts) {
                resolved = true;
                cleanup();
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                const savings = (((file.size - blob.size) / file.size) * 100).toFixed(0);
                console.log(
                  `[compressImage] ✅ Done: ${(file.size / 1024).toFixed(0)}KB → ${sizeKB.toFixed(0)}KB (${savings}% saved)`
                );
                resolve(compressedFile);
              } else {
                // Reduce quality more aggressively
                quality -= 0.1;
                tryCompress();
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
      console.error("[compressImage] Failed to load image");
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
