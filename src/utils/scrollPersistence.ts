/**
 * Scroll state persistence utilities
 * Prevents header flash/jump when navigating between pages
 */

const SCROLL_STATE_KEY = "foodshare_scroll_state";

export interface PersistedScrollState {
  scrollY: number;
  isCompact: boolean;
  timestamp: number;
}

/**
 * Save current scroll state to session storage
 * State expires after 5 seconds to prevent stale data
 */
export const saveScrollState = (scrollY: number, isCompact: boolean): void => {
  try {
    const state: PersistedScrollState = {
      scrollY,
      isCompact,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SCROLL_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    // Silently fail if sessionStorage is not available
    console.warn("Failed to save scroll state:", error);
  }
};

/**
 * Restore scroll state from session storage
 * Returns null if no valid state exists or state is expired
 */
export const restoreScrollState = (): PersistedScrollState | null => {
  try {
    const stored = sessionStorage.getItem(SCROLL_STATE_KEY);
    if (!stored) return null;

    const state: PersistedScrollState = JSON.parse(stored);
    const age = Date.now() - state.timestamp;

    // Expire after 5 seconds
    if (age > 5000) {
      sessionStorage.removeItem(SCROLL_STATE_KEY);
      return null;
    }

    return state;
  } catch (error) {
    console.warn("Failed to restore scroll state:", error);
    return null;
  }
};

/**
 * Clear scroll state from session storage
 */
export const clearScrollState = (): void => {
  try {
    sessionStorage.removeItem(SCROLL_STATE_KEY);
  } catch (error) {
    console.warn("Failed to clear scroll state:", error);
  }
};
