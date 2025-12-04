/**
 * UI Store (Zustand)
 * Manages application-wide UI state with persistence
 * Replaces Redux ui slice
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ============================================================================
// Types
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type Theme = "light" | "dark" | "system";

export interface ThemeSchedule {
  enabled: boolean;
  lightStart: string; // "07:00"
  darkStart: string; // "19:00"
}

export type AccentColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "teal"
  | "red"
  | "custom";

export type ContrastMode = "normal" | "high" | "reduced";

export type ThemePreset =
  | "default"
  | "midnight"
  | "forest"
  | "sunset"
  | "ocean"
  | "lavender"
  | "custom";

export interface AccentColorConfig {
  name: AccentColor;
  hue: number;
  saturation: number;
  customHex?: string;
}

export type ThemeTransition = "instant" | "smooth" | "radial";

// ============================================================================
// Default Values
// ============================================================================

const defaultAccentColor: AccentColorConfig = {
  name: "green",
  hue: 142,
  saturation: 71,
};

// ============================================================================
// Store Interface
// ============================================================================

interface UIState {
  // Language
  language: string;
  setLanguage: (language: string) => void;

  // Location
  userLocation: Coordinates | null;
  setUserLocation: (location: Coordinates) => void;
  clearUserLocation: () => void;

  // Geo Distance Filter (for product search radius)
  geoDistance: number | null;
  setGeoDistance: (distance: number | null) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Theme Schedule
  themeSchedule: ThemeSchedule;
  setThemeSchedule: (schedule: Partial<ThemeSchedule>) => void;

  // Theme Transition
  themeTransition: ThemeTransition;
  setThemeTransition: (transition: ThemeTransition) => void;

  // Accent Color
  accentColor: AccentColorConfig;
  setAccentColor: (color: AccentColorConfig) => void;

  // Contrast Mode
  contrastMode: ContrastMode;
  setContrastMode: (mode: ContrastMode) => void;

  // Theme Preset
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;

  // Accessibility
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;

  // Apply complete preset
  applyThemePreset: (config: {
    preset: ThemePreset;
    theme?: Theme;
    accentColor: AccentColorConfig;
    contrastMode?: ContrastMode;
  }) => void;

  // Reset to defaults
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Language
      language: "en",
      setLanguage: (language) => set({ language }),

      // Location
      userLocation: null,
      setUserLocation: (location) => set({ userLocation: location }),
      clearUserLocation: () => set({ userLocation: null }),

      // Geo Distance Filter
      geoDistance: null,
      setGeoDistance: (distance) => set({ geoDistance: distance }),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),

      // Theme Schedule
      themeSchedule: {
        enabled: false,
        lightStart: "07:00",
        darkStart: "19:00",
      },
      setThemeSchedule: (schedule) =>
        set((state) => ({
          themeSchedule: { ...state.themeSchedule, ...schedule },
        })),

      // Theme Transition
      themeTransition: "radial",
      setThemeTransition: (transition) => set({ themeTransition: transition }),

      // Accent Color
      accentColor: defaultAccentColor,
      setAccentColor: (color) =>
        set({
          accentColor: color,
          themePreset: "custom", // Switch to custom when manually changing
        }),

      // Contrast Mode
      contrastMode: "normal",
      setContrastMode: (mode) => set({ contrastMode: mode }),

      // Theme Preset
      themePreset: "default",
      setThemePreset: (preset) => set({ themePreset: preset }),

      // Accessibility
      reducedMotion: false,
      setReducedMotion: (reduced) => set({ reducedMotion: reduced }),

      // Apply complete preset
      applyThemePreset: ({ preset, theme, accentColor, contrastMode }) =>
        set((state) => ({
          themePreset: preset,
          accentColor,
          theme: theme ?? state.theme,
          contrastMode: contrastMode ?? state.contrastMode,
        })),

      // Reset
      reset: () =>
        set({
          language: "en",
          userLocation: null,
          geoDistance: null,
          theme: "system",
          themeSchedule: {
            enabled: false,
            lightStart: "07:00",
            darkStart: "19:00",
          },
          themeTransition: "radial",
          accentColor: defaultAccentColor,
          contrastMode: "normal",
          themePreset: "default",
          reducedMotion: false,
        }),
    }),
    {
      name: "foodshare-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        language: state.language,
        theme: state.theme,
        themeSchedule: state.themeSchedule,
        themeTransition: state.themeTransition,
        accentColor: state.accentColor,
        contrastMode: state.contrastMode,
        themePreset: state.themePreset,
        reducedMotion: state.reducedMotion,
        // Note: userLocation is NOT persisted (privacy)
      }),
    }
  )
);

// ============================================================================
// Selectors (pure functions for use with useUIStore)
// ============================================================================

export const selectTheme = (state: UIState) => state.theme;
export const selectAccentColor = (state: UIState) => state.accentColor;
export const selectUserLocation = (state: UIState) => state.userLocation;
export const selectLanguage = (state: UIState) => state.language;
export const selectReducedMotion = (state: UIState) => state.reducedMotion;
export const selectGeoDistance = (state: UIState) => state.geoDistance;

// ============================================================================
// Custom Hooks (convenience hooks for common selections)
// ============================================================================

export const useTheme = () => useUIStore(selectTheme);
export const useAccentColor = () => useUIStore(selectAccentColor);
export const useUserLocationUI = () => useUIStore(selectUserLocation);
export const useLanguage = () => useUIStore(selectLanguage);
export const useReducedMotion = () => useUIStore(selectReducedMotion);
export const useGeoDistance = () => useUIStore(selectGeoDistance);
