/**
 * useTheme Hook
 * Advanced theme management with scheduling, transitions, accessibility,
 * haptic feedback, and Supabase sync for logged-in users
 *
 * Uses Zustand for state management (migrated from Redux)
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useUIStore } from "@/store/zustand";
import { useSession } from "@/hooks/queries";
import { themeAPI } from "@/api/themeAPI";
import {
  triggerHaptic,
  applyAccentColor,
  applyContrastMode,
  type FontScale,
  applyFontScale,
} from "@/lib/theme/themeConfig";
import type {
  Theme,
  ThemeSchedule,
  AccentColorConfig,
  ContrastMode,
} from "@/store/zustand/useUIStore";

type ResolvedTheme = "light" | "dark";
type TransitionType = "instant" | "smooth" | "radial";



interface UseThemeReturn {
  // Core theme
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme, withHaptic?: boolean) => void;
  toggleTheme: (withHaptic?: boolean) => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  // Scheduling
  schedule: ThemeSchedule;
  setSchedule: (schedule: Partial<ThemeSchedule>) => void;
  // Transitions
  transition: TransitionType;
  setTransition: (transition: TransitionType) => void;
  // Accent colors
  accentColor: AccentColorConfig;
  setAccentColor: (config: AccentColorConfig, withHaptic?: boolean) => void;
  // Accessibility
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  // Haptic feedback
  hapticEnabled: boolean;
  setHapticEnabled: (enabled: boolean) => void;
}

/**
 * Get the system's preferred color scheme
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Check if current time falls within dark mode hours
 */
const isInDarkHours = (schedule: ThemeSchedule): boolean => {
  if (!schedule?.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [lightHour, lightMin] = (schedule.lightStart || "07:00").split(":").map(Number);
  const [darkHour, darkMin] = (schedule.darkStart || "19:00").split(":").map(Number);

  const lightMinutes = lightHour * 60 + lightMin;
  const darkMinutes = darkHour * 60 + darkMin;

  // Handle the case where dark time is after light time (normal day)
  if (darkMinutes > lightMinutes) {
    return currentMinutes >= darkMinutes || currentMinutes < lightMinutes;
  }
  // Handle the case where dark time wraps around midnight
  return currentMinutes >= darkMinutes && currentMinutes < lightMinutes;
};

/**
 * Apply theme class to document root
 */
const applyThemeToDOM = (resolvedTheme: ResolvedTheme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);

  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", resolvedTheme === "dark" ? "#030712" : "#ffffff");
  }
};

// Local storage keys for non-store state
const HAPTIC_ENABLED_KEY = "theme-haptic-enabled";
const FONT_SCALE_KEY = "theme-font-scale";

export const useTheme = (): UseThemeReturn => {
  // ========================================================================
  // Zustand Store
  // ========================================================================

  const {
    theme,
    themeSchedule: schedule,
    themeTransition: transition,
    accentColor,
    contrastMode,
    reducedMotion,
    setTheme: setStoreTheme,
    setThemeSchedule: setStoreSchedule,
    setThemeTransition: setStoreTransition,
    setAccentColor: setStoreAccentColor,
    setContrastMode: setStoreContrastMode,
    setReducedMotion: setStoreReducedMotion,
  } = useUIStore();

  // Auth state for Supabase sync
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isAuthenticated = !!session?.user;
  const hasSyncedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Local state for haptic and font scale (stored in localStorage)
  const hapticEnabledRef = useRef(
    typeof window !== "undefined" ? localStorage.getItem(HAPTIC_ENABLED_KEY) !== "false" : true
  );
  const fontScaleRef = useRef<FontScale>(
    (typeof window !== "undefined" ? (localStorage.getItem(FONT_SCALE_KEY) as FontScale) : null) ||
    "base"
  );

  // Resolve the actual theme (accounting for system preference and schedule)
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    // If schedule is enabled, use schedule-based theme
    if (schedule?.enabled) {
      return isInDarkHours(schedule) ? "dark" : "light";
    }

    // Otherwise use theme setting
    if (theme === "system") {
      return getSystemTheme();
    }
    return theme as ResolvedTheme;
  }, [theme, schedule]);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== "system" || schedule?.enabled) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyThemeToDOM(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, schedule?.enabled]);

  // Check schedule every minute
  useEffect(() => {
    if (!schedule?.enabled) return;

    const checkSchedule = () => {
      const shouldBeDark = isInDarkHours(schedule);
      const currentIsDark = document.documentElement.classList.contains("dark");

      if (shouldBeDark !== currentIsDark) {
        applyThemeToDOM(shouldBeDark ? "dark" : "light");
      }
    };

    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [schedule]);

  // Sync theme preferences from Supabase on login
  useEffect(() => {
    if (!isAuthenticated || !userId || hasSyncedRef.current || isSyncingRef.current) return;

    const syncFromSupabase = async () => {
      isSyncingRef.current = true;
      try {
        const prefs = await themeAPI.getThemePreferences(userId);
        if (prefs) {
          // Only apply if different from current settings
          if (prefs.theme !== theme) {
            setStoreTheme(prefs.theme);
          }
          if (JSON.stringify(prefs.schedule) !== JSON.stringify(schedule)) {
            setStoreSchedule(prefs.schedule);
          }
          if (prefs.transition !== transition) {
            setStoreTransition(prefs.transition);
          }
        }
        hasSyncedRef.current = true;
      } catch {
        // Silently fail theme sync - user can manually set theme
      } finally {
        isSyncingRef.current = false;
      }
    };

    syncFromSupabase();
  }, [isAuthenticated, userId, theme, schedule, transition, setStoreTheme, setStoreSchedule, setStoreTransition]);

  // Reset sync flag on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
    }
  }, [isAuthenticated]);

  // Set theme action with Supabase sync and optional haptic
  const handleSetTheme = useCallback(
    (newTheme: Theme, withHaptic = true) => {
      if (withHaptic && hapticEnabledRef.current) {
        triggerHaptic("light");
      }
      setStoreTheme(newTheme);
      // Sync to Supabase if logged in
      if (isAuthenticated && userId) {
        themeAPI.setTheme(userId, newTheme).catch(() => { });
      }
    },
    [setStoreTheme, isAuthenticated, userId]
  );

  // Toggle between light and dark with Supabase sync and optional haptic
  const toggleTheme = useCallback(
    (withHaptic = true) => {
      if (withHaptic && hapticEnabledRef.current) {
        triggerHaptic("medium");
      }
      const newTheme = resolvedTheme === "dark" ? "light" : "dark";
      setStoreTheme(newTheme);
      // Disable schedule when manually toggling
      if (schedule?.enabled) {
        setStoreSchedule({ enabled: false });
      }
      // Sync to Supabase if logged in
      if (isAuthenticated && userId) {
        themeAPI
          .updateThemePreferences(userId, {
            theme: newTheme,
            schedule: { ...schedule, enabled: false },
          })
          .catch(() => { });
      }
    },
    [setStoreTheme, setStoreSchedule, resolvedTheme, schedule, isAuthenticated, userId]
  );

  // Set schedule with Supabase sync
  const handleSetSchedule = useCallback(
    (newSchedule: Partial<ThemeSchedule>) => {
      setStoreSchedule(newSchedule);
      // Sync to Supabase if logged in
      if (isAuthenticated && userId) {
        themeAPI.setSchedule(userId, newSchedule).catch(() => { });
      }
    },
    [setStoreSchedule, isAuthenticated, userId]
  );

  // Set transition with Supabase sync
  const handleSetTransition = useCallback(
    (newTransition: TransitionType) => {
      setStoreTransition(newTransition);
      // Sync to Supabase if logged in
      if (isAuthenticated && userId) {
        themeAPI.setTransition(userId, newTransition).catch(() => { });
      }
    },
    [setStoreTransition, isAuthenticated, userId]
  );

  // Set accent color with optional haptic
  const handleSetAccentColor = useCallback(
    (config: AccentColorConfig, withHaptic = true) => {
      if (withHaptic && hapticEnabledRef.current) {
        triggerHaptic("light");
      }
      setStoreAccentColor(config);
      applyAccentColor(config, contrastMode);
    },
    [setStoreAccentColor, contrastMode]
  );

  // Set contrast mode
  const handleSetContrastMode = useCallback(
    (mode: ContrastMode) => {
      setStoreContrastMode(mode);
      applyContrastMode(mode);
      // Re-apply accent color with new contrast
      if (accentColor) {
        applyAccentColor(accentColor, mode);
      }
    },
    [setStoreContrastMode, accentColor]
  );

  // Set reduced motion
  const handleSetReducedMotion = useCallback(
    (enabled: boolean) => {
      setStoreReducedMotion(enabled);
      const root = document.documentElement;
      if (enabled) {
        root.classList.add("reduce-motion");
      } else {
        root.classList.remove("reduce-motion");
      }
    },
    [setStoreReducedMotion]
  );

  // Set font scale
  const handleSetFontScale = useCallback((scale: FontScale) => {
    fontScaleRef.current = scale;
    localStorage.setItem(FONT_SCALE_KEY, scale);
    applyFontScale(scale);
  }, []);

  // Set haptic enabled
  const handleSetHapticEnabled = useCallback((enabled: boolean) => {
    hapticEnabledRef.current = enabled;
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
    if (enabled) {
      triggerHaptic("light"); // Confirm haptic is enabled
    }
  }, []);

  // Apply accent color and contrast mode on mount and changes
  useEffect(() => {
    if (accentColor) {
      applyAccentColor(accentColor, contrastMode);
    }
    applyContrastMode(contrastMode);
  }, [accentColor, contrastMode, resolvedTheme]);

  // Apply font scale on mount
  useEffect(() => {
    if (fontScaleRef.current !== "base") {
      applyFontScale(fontScaleRef.current);
    }
  }, []);

  // Apply reduced motion on mount
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    }
  }, [reducedMotion]);

  return {
    // Core theme
    theme: theme as Theme,
    resolvedTheme,
    setTheme: handleSetTheme,
    toggleTheme,
    isDark: resolvedTheme === "dark",
    isLight: resolvedTheme === "light",
    isSystem: theme === "system",
    // Scheduling
    schedule: schedule || { enabled: false, lightStart: "07:00", darkStart: "19:00" },
    setSchedule: handleSetSchedule,
    // Transitions
    transition: (transition || "radial") as TransitionType,
    setTransition: handleSetTransition,
    // Accent colors
    accentColor: accentColor || { name: "green", hue: 142, saturation: 71 },
    setAccentColor: handleSetAccentColor,
    // Accessibility
    contrastMode: (contrastMode || "normal") as ContrastMode,
    setContrastMode: handleSetContrastMode,
    reducedMotion: reducedMotion || false,
    setReducedMotion: handleSetReducedMotion,
    fontScale: fontScaleRef.current,
    setFontScale: handleSetFontScale,
    // Haptic feedback
    hapticEnabled: hapticEnabledRef.current,
    setHapticEnabled: handleSetHapticEnabled,
  };
};

/**
 * Initialize theme on app load
 */
export const initializeTheme = (theme: Theme, schedule?: ThemeSchedule) => {
  let resolvedTheme: ResolvedTheme;

  if (schedule?.enabled) {
    resolvedTheme = isInDarkHours(schedule) ? "dark" : "light";
  } else if (theme === "system") {
    resolvedTheme = getSystemTheme();
  } else {
    resolvedTheme = theme;
  }

  applyThemeToDOM(resolvedTheme);
};
