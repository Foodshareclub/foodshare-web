/**
 * Theme Configuration
 * Accent colors, presets, and theme utilities
 */

import type {
  AccentColor,
  AccentColorConfig,
  ThemePreset,
  ContrastMode,
} from "@/store/zustand/useUIStore";

// ============================================================================
// Accent Color Definitions
// ============================================================================

// Explicitly mark as used to prevent tree-shaking
export const ACCENT_COLORS: Record<Exclude<AccentColor, "custom">, AccentColorConfig> = {
  green: { name: "green", hue: 142, saturation: 71 },
  blue: { name: "blue", hue: 217, saturation: 91 },
  purple: { name: "purple", hue: 262, saturation: 83 },
  pink: { name: "pink", hue: 340, saturation: 82 },
  orange: { name: "orange", hue: 25, saturation: 95 },
  teal: { name: "teal", hue: 172, saturation: 66 },
  red: { name: "red", hue: 0, saturation: 84 },
} as const;

// ============================================================================
// Theme Presets
// ============================================================================

export interface ThemePresetConfig {
  id: ThemePreset;
  name: string;
  description: string;
  accentColor: AccentColorConfig;
  prefersDark?: boolean;
  preview: {
    primary: string;
    secondary: string;
    background: string;
    accent: string;
  };
}

export const THEME_PRESETS: Record<Exclude<ThemePreset, "custom">, ThemePresetConfig> = {
  default: {
    id: "default",
    name: "FoodShare",
    description: "Classic green, fresh and natural",
    accentColor: ACCENT_COLORS.green,
    preview: {
      primary: "#22c55e",
      secondary: "#16a34a",
      background: "#f0fdf4",
      accent: "#15803d",
    },
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Deep dark with electric blue",
    accentColor: ACCENT_COLORS.blue,
    prefersDark: true,
    preview: {
      primary: "#3b82f6",
      secondary: "#2563eb",
      background: "#0f172a",
      accent: "#60a5fa",
    },
  },
  forest: {
    id: "forest",
    name: "Forest",
    description: "Rich woodland greens",
    accentColor: { name: "green", hue: 158, saturation: 64 },
    preview: {
      primary: "#10b981",
      secondary: "#059669",
      background: "#ecfdf5",
      accent: "#047857",
    },
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange and coral",
    accentColor: ACCENT_COLORS.orange,
    preview: {
      primary: "#f97316",
      secondary: "#ea580c",
      background: "#fff7ed",
      accent: "#c2410c",
    },
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    description: "Calm teal waters",
    accentColor: ACCENT_COLORS.teal,
    preview: {
      primary: "#14b8a6",
      secondary: "#0d9488",
      background: "#f0fdfa",
      accent: "#0f766e",
    },
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    description: "Soft purple elegance",
    accentColor: ACCENT_COLORS.purple,
    preview: {
      primary: "#a855f7",
      secondary: "#9333ea",
      background: "#faf5ff",
      accent: "#7c3aed",
    },
  },
};

// ============================================================================
// Seasonal Theme Presets
// ============================================================================

export interface SeasonalPreset {
  id: string;
  name: string;
  description: string;
  emoji: string;
  accentColor: AccentColorConfig;
  prefersDark?: boolean;
  gradient: string;
  activeMonths: number[]; // 0 = Jan, 11 = Dec
}

export const SEASONAL_PRESETS: SeasonalPreset[] = [
  {
    id: "spring",
    name: "Spring Bloom",
    description: "Fresh cherry blossoms",
    emoji: "🌸",
    accentColor: { name: "pink", hue: 350, saturation: 75 },
    gradient: "linear-gradient(135deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)",
    activeMonths: [2, 3, 4], // Mar, Apr, May
  },
  {
    id: "summer",
    name: "Summer Sun",
    description: "Bright and energetic",
    emoji: "☀️",
    accentColor: { name: "orange", hue: 38, saturation: 92 },
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)",
    activeMonths: [5, 6, 7], // Jun, Jul, Aug
  },
  {
    id: "autumn",
    name: "Autumn Harvest",
    description: "Warm fall colors",
    emoji: "🍂",
    accentColor: { name: "orange", hue: 24, saturation: 85 },
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fdba74 100%)",
    activeMonths: [8, 9, 10], // Sep, Oct, Nov
  },
  {
    id: "winter",
    name: "Winter Frost",
    description: "Cool and crisp",
    emoji: "❄️",
    accentColor: { name: "blue", hue: 200, saturation: 80 },
    prefersDark: true,
    gradient: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%)",
    activeMonths: [11, 0, 1], // Dec, Jan, Feb
  },
  {
    id: "holiday",
    name: "Holiday Spirit",
    description: "Festive red and green",
    emoji: "🎄",
    accentColor: { name: "red", hue: 0, saturation: 80 },
    gradient: "linear-gradient(135deg, #fecaca 0%, #dc2626 50%, #166534 100%)",
    activeMonths: [11], // December only
  },
  {
    id: "valentine",
    name: "Valentine",
    description: "Love is in the air",
    emoji: "💕",
    accentColor: { name: "pink", hue: 340, saturation: 85 },
    gradient: "linear-gradient(135deg, #fce7f3 0%, #f472b6 50%, #ec4899 100%)",
    activeMonths: [1], // February only
  },
];

/**
 * Get the current seasonal preset based on date
 */
export function getCurrentSeasonalPreset(): SeasonalPreset | null {
  const month = new Date().getMonth();
  return SEASONAL_PRESETS.find((preset) => preset.activeMonths.includes(month)) || null;
}

// ============================================================================
// Haptic Feedback
// ============================================================================

/**
 * Trigger haptic feedback on supported devices
 */
export function triggerHaptic(style: "light" | "medium" | "heavy" = "light"): void {
  // Check for Vibration API
  if ("vibrate" in navigator) {
    const patterns: Record<string, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[style]);
  }
}

// ============================================================================
// Font Scale Options (Accessibility)
// ============================================================================

export type FontScale = "xs" | "sm" | "base" | "lg" | "xl";

export const FONT_SCALES: Record<FontScale, { label: string; multiplier: number }> = {
  xs: { label: "Extra Small", multiplier: 0.875 },
  sm: { label: "Small", multiplier: 0.9375 },
  base: { label: "Normal", multiplier: 1 },
  lg: { label: "Large", multiplier: 1.125 },
  xl: { label: "Extra Large", multiplier: 1.25 },
};

/**
 * Apply font scale to document
 */
export function applyFontScale(scale: FontScale): void {
  const root = document.documentElement;
  const multiplier = FONT_SCALES[scale].multiplier;
  root.style.setProperty("--font-scale", String(multiplier));
  root.style.fontSize = `${multiplier * 100}%`;
}

// ============================================================================
// Theme Preview Mode
// ============================================================================

let previewCleanup: (() => void) | null = null;

/**
 * Preview a theme temporarily without applying it
 */
export function previewTheme(preset: ThemePresetConfig, isDark: boolean): () => void {
  // Store original values
  const root = document.documentElement;
  const originalClass = root.className;
  const originalStyle = root.getAttribute("style") || "";

  // Apply preview
  root.classList.remove("light", "dark");
  root.classList.add(isDark || preset.prefersDark ? "dark" : "light");
  applyAccentColor(preset.accentColor);

  // Add preview indicator
  root.dataset.previewMode = "true";

  // Cleanup function
  const cleanup = () => {
    root.className = originalClass;
    root.setAttribute("style", originalStyle);
    delete root.dataset.previewMode;
    previewCleanup = null;
  };

  // Clear any existing preview
  if (previewCleanup) {
    previewCleanup();
  }
  previewCleanup = cleanup;

  return cleanup;
}

/**
 * Cancel any active theme preview
 */
export function cancelPreview(): void {
  if (previewCleanup) {
    previewCleanup();
    previewCleanup = null;
  }
}

// ============================================================================
// Contrast Mode Configurations
// ============================================================================

export interface ContrastConfig {
  id: ContrastMode;
  name: string;
  description: string;
  multiplier: number;
}

export const CONTRAST_MODES: Record<ContrastMode, ContrastConfig> = {
  normal: {
    id: "normal",
    name: "Normal",
    description: "Standard contrast",
    multiplier: 1,
  },
  high: {
    id: "high",
    name: "High",
    description: "Enhanced contrast for better visibility",
    multiplier: 1.3,
  },
  reduced: {
    id: "reduced",
    name: "Reduced",
    description: "Softer, less intense colors",
    multiplier: 0.8,
  },
};

// ============================================================================
// CSS Variable Generation
// ============================================================================

/**
 * Generate CSS custom properties for accent color
 * Returns CSS string in HSL format (without hsl() wrapper) for Tailwind 4
 */
export function generateAccentCSS(
  config: AccentColorConfig,
  contrastMode: ContrastMode = "normal",
  isDark: boolean = false
): string {
  const { hue, saturation } = config;
  const contrast = CONTRAST_MODES[contrastMode].multiplier;
  const adjustedSat = Math.min(100, Math.round(saturation * contrast));
  const lightness = isDark ? 55 : 45;
  const primaryHoverLightness = isDark ? 60 : 40;
  const foreground = isDark ? "240 10% 3.9%" : "0 0% 100%";

  return `
    --accent-hue: ${hue};
    --accent-saturation: ${adjustedSat}%;
    --primary: ${hue} ${adjustedSat}% ${lightness}%;
    --primary-foreground: ${foreground};
    --primary-hover: ${hue} ${adjustedSat}% ${primaryHoverLightness}%;
    --ring: ${hue} ${adjustedSat}% ${lightness}%;
    --sidebar-primary: ${hue} ${adjustedSat}% ${lightness}%;
    --sidebar-primary-foreground: ${foreground};
    --sidebar-ring: ${hue} ${adjustedSat}% ${lightness}%;
  `;
}

/**
 * Apply accent color to document
 * Updates CSS variables in HSL format (without hsl() wrapper) to match Tailwind 4 expectations
 */
export function applyAccentColor(
  config: AccentColorConfig,
  contrastMode: ContrastMode = "normal"
): void {
  const root = document.documentElement;
  const { hue, saturation } = config;
  const contrast = CONTRAST_MODES[contrastMode].multiplier;
  const adjustedSat = Math.min(100, Math.round(saturation * contrast));

  // Detect current theme
  const isDark = root.classList.contains("dark");

  // Lightness values for light and dark modes
  const lightLightness = 45;
  const darkLightness = 55;
  const lightness = isDark ? darkLightness : lightLightness;
  const primaryHoverLightness = isDark ? lightness + 5 : lightness - 5;

  // Update CSS variables in HSL format (without hsl() wrapper)
  // This format is expected by Tailwind 4 and our globals.css
  root.style.setProperty("--accent-hue", String(hue));
  root.style.setProperty("--accent-saturation", `${adjustedSat}%`);
  root.style.setProperty("--primary", `${hue} ${adjustedSat}% ${lightness}%`);
  root.style.setProperty("--ring", `${hue} ${adjustedSat}% ${lightness}%`);
  root.style.setProperty("--primary-hover", `${hue} ${adjustedSat}% ${primaryHoverLightness}%`);

  // Update primary foreground for proper contrast
  // Light mode: white text, Dark mode: dark text
  root.style.setProperty(
    "--primary-foreground",
    isDark ? "240 10% 3.9%" : "0 0% 100%"
  );

  // Also update sidebar primary to match
  root.style.setProperty("--sidebar-primary", `${hue} ${adjustedSat}% ${lightness}%`);
  root.style.setProperty(
    "--sidebar-primary-foreground",
    isDark ? "240 10% 3.9%" : "0 0% 100%"
  );
  root.style.setProperty("--sidebar-ring", `${hue} ${adjustedSat}% ${lightness}%`);
}

/**
 * Apply contrast mode to document
 */
export function applyContrastMode(mode: ContrastMode): void {
  const root = document.documentElement;
  root.dataset.contrast = mode;

  // Remove previous contrast classes
  root.classList.remove("contrast-high", "contrast-reduced");

  if (mode === "high") {
    root.classList.add("contrast-high");
  } else if (mode === "reduced") {
    root.classList.add("contrast-reduced");
  }
}

/**
 * Convert hex to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ============================================================================
// Color Blindness Simulation
// ============================================================================

export type ColorBlindnessMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

export interface ColorBlindnessConfig {
  id: ColorBlindnessMode;
  name: string;
  description: string;
  filter: string;
}

/**
 * Color blindness simulation configurations
 */
export const COLOR_BLINDNESS_MODES: Record<ColorBlindnessMode, ColorBlindnessConfig> = {
  none: {
    id: "none",
    name: "Normal Vision",
    description: "No color simulation",
    filter: "none",
  },
  protanopia: {
    id: "protanopia",
    name: "Protanopia",
    description: "Red-blind (1% of males)",
    filter: "url(#protanopia-filter)",
  },
  deuteranopia: {
    id: "deuteranopia",
    name: "Deuteranopia",
    description: "Green-blind (6% of males)",
    filter: "url(#deuteranopia-filter)",
  },
  tritanopia: {
    id: "tritanopia",
    name: "Tritanopia",
    description: "Blue-blind (rare)",
    filter: "url(#tritanopia-filter)",
  },
  achromatopsia: {
    id: "achromatopsia",
    name: "Achromatopsia",
    description: "Complete color blindness",
    filter: "grayscale(100%)",
  },
};

// Color matrix values for different color blindness types
const COLOR_MATRICES = {
  protanopia: "0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0",
  deuteranopia: "0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0",
  tritanopia: "0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0",
};

let filtersInjected = false;

/**
 * Inject SVG filters into the document using safe DOM methods
 */
export function injectColorBlindnessFilters(): void {
  if (filtersInjected || typeof document === "undefined") return;

  const svgNS = "http://www.w3.org/2000/svg";

  // Create SVG element
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("xmlns", svgNS);
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.style.overflow = "hidden";

  const defs = document.createElementNS(svgNS, "defs");

  // Create filters for each color blindness type
  Object.entries(COLOR_MATRICES).forEach(([type, matrix]) => {
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", `${type}-filter`);

    const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
    feColorMatrix.setAttribute("type", "matrix");
    feColorMatrix.setAttribute("values", matrix);

    filter.appendChild(feColorMatrix);
    defs.appendChild(filter);
  });

  svg.appendChild(defs);
  document.body.appendChild(svg);
  filtersInjected = true;
}

/**
 * Apply color blindness simulation to the document
 */
export function applyColorBlindnessMode(mode: ColorBlindnessMode): void {
  const root = document.documentElement;
  const config = COLOR_BLINDNESS_MODES[mode];

  // Ensure filters are injected
  if (mode !== "none" && mode !== "achromatopsia") {
    injectColorBlindnessFilters();
  }

  // Remove previous color blindness classes
  root.classList.remove("cb-protanopia", "cb-deuteranopia", "cb-tritanopia", "cb-achromatopsia");

  // Apply filter
  if (mode === "none") {
    root.style.filter = "";
  } else if (mode === "achromatopsia") {
    root.style.filter = config.filter;
  } else {
    root.style.filter = config.filter;
    root.classList.add(`cb-${mode}`);
  }

  // Store preference
  root.dataset.colorBlindness = mode;
}

/**
 * Get current color blindness mode
 */
export function getCurrentColorBlindnessMode(): ColorBlindnessMode {
  if (typeof document === "undefined") return "none";
  return (document.documentElement.dataset.colorBlindness as ColorBlindnessMode) || "none";
}

// ============================================================================
// Reduced Motion Support
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Subscribe to reduced motion preference changes
 */
export function onReducedMotionChange(callback: (prefersReduced: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => callback(e.matches);

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

/**
 * Apply reduced motion class to document
 */
export function applyReducedMotion(enabled: boolean): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (enabled) {
    root.classList.add("reduce-motion");
    root.style.setProperty("--transition-duration", "0.01ms");
    root.style.setProperty("--animation-duration", "0.01ms");
  } else {
    root.classList.remove("reduce-motion");
    root.style.removeProperty("--transition-duration");
    root.style.removeProperty("--animation-duration");
  }
  root.dataset.reducedMotion = String(enabled);
}

/**
 * Get current reduced motion setting
 */
export function getReducedMotionSetting(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.reducedMotion === "true";
}

// ============================================================================
// Theme Transition Animations
// ============================================================================

/**
 * Apply smooth theme transition
 */
export function enableThemeTransition(): void {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion() || getReducedMotionSetting()) return;

  const root = document.documentElement;
  root.classList.add("theme-transitioning");

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove("theme-transitioning");
  }, 300);
}

/**
 * Get animation variants based on reduced motion preference
 */
export function getMotionVariants<T extends Record<string, unknown>>(
  fullMotion: T,
  reducedMotion: T
): T {
  return prefersReducedMotion() || getReducedMotionSetting() ? reducedMotion : fullMotion;
}
