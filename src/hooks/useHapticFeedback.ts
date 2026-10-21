/**
 * Haptic Feedback Hook
 * Provides tactile feedback for mobile interactions
 *
 * Uses the Vibration API where available, with graceful fallback
 */

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

interface HapticOptions {
  /** Whether haptic feedback is enabled globally */
  enabled?: boolean;
}

interface HapticFeedback {
  /** Trigger haptic feedback */
  trigger: (type?: HapticType) => void;
  /** Check if haptic feedback is supported */
  isSupported: boolean;
}

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 10], // Short-pause-short
  warning: [20, 30, 20, 30, 20], // Triple pulse
  error: [50, 100, 50], // Strong-pause-strong
};

/**
 * Hook for triggering haptic feedback on mobile devices
 *
 * @example
 * ```tsx
 * function LikeButton() {
 *   const { trigger } = useHapticFeedback();
 *
 *   const handleLike = () => {
 *     trigger('success');
 *     // ... perform like action
 *   };
 *
 *   return <button onClick={handleLike}>Like</button>;
 * }
 * ```
 */
export function useHapticFeedback(options: HapticOptions = {}): HapticFeedback {
  const { enabled = true } = options;

  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const trigger = (type: HapticType = "light"): void => {
    if (!enabled || !isSupported) return;

    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration is not allowed
    }
  };

  return {
    trigger,
    isSupported,
  };
}

/**
 * Utility function for one-off haptic feedback
 * Use this when you don't need the hook pattern
 */
export function triggerHaptic(type: HapticType = "light"): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;

  try {
    const pattern = HAPTIC_PATTERNS[type];
    navigator.vibrate(pattern);
  } catch {
    // Silently fail
  }
}
