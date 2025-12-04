'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUIStore, type AccentColorConfig, type ContrastMode, type ThemePreset } from '@/store/zustand/useUIStore';
import {
  THEME_PRESETS,
  applyAccentColor,
  applyContrastMode,
  applyFontScale,
  applyColorBlindnessMode,
  triggerHaptic,
  type FontScale,
  type SeasonalPreset,
  type ColorBlindnessMode,
} from '@/lib/theme/themeConfig';

// Local storage keys
const HAPTIC_ENABLED_KEY = 'theme-haptic-enabled';
const FONT_SCALE_KEY = 'theme-font-scale';
const COLOR_BLINDNESS_KEY = 'theme-color-blindness';

interface UseThemeCustomizationReturn {
  // Store values
  theme: string;
  accentColor: AccentColorConfig;
  contrastMode: ContrastMode;
  themePreset: ThemePreset;
  reducedMotion: boolean;

  // Local state
  hapticEnabled: boolean;
  fontScale: FontScale;
  colorBlindness: ColorBlindnessMode;
  selectedSeasonal: string | null;

  // Handlers
  handleAccentChange: (color: AccentColorConfig) => void;
  handleContrastChange: (mode: ContrastMode) => void;
  handlePresetSelect: (presetId: ThemePreset) => void;
  handleSeasonalSelect: (seasonal: SeasonalPreset) => void;
  handleReducedMotionToggle: () => void;
  handleFontScaleChange: (scale: FontScale) => void;
  handleHapticToggle: () => void;
  handleColorBlindnessChange: (mode: ColorBlindnessMode) => void;
}

export function useThemeCustomization(): UseThemeCustomizationReturn {
  // Zustand store
  const {
    theme,
    accentColor,
    contrastMode,
    themePreset,
    reducedMotion,
    setAccentColor,
    setContrastMode,
    setReducedMotion,
    applyThemePreset,
  } = useUIStore();

  const [selectedSeasonal, setSelectedSeasonal] = useState<string | null>(null);

  // Local state for haptic and font scale (stored in localStorage)
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(HAPTIC_ENABLED_KEY) !== 'false';
  });

  const [fontScale, setFontScale] = useState<FontScale>(() => {
    if (typeof window === 'undefined') return 'base';
    return (localStorage.getItem(FONT_SCALE_KEY) as FontScale) || 'base';
  });

  const [colorBlindness, setColorBlindness] = useState<ColorBlindnessMode>(() => {
    if (typeof window === 'undefined') return 'none';
    return (localStorage.getItem(COLOR_BLINDNESS_KEY) as ColorBlindnessMode) || 'none';
  });

  // Apply font scale and color blindness on mount
  useEffect(() => {
    if (fontScale !== 'base') {
      applyFontScale(fontScale);
    }
    if (colorBlindness !== 'none') {
      applyColorBlindnessMode(colorBlindness);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle accent color change with haptic
  const handleAccentChange = useCallback(
    (color: AccentColorConfig) => {
      if (hapticEnabled) triggerHaptic('light');
      setAccentColor(color);
      applyAccentColor(color, contrastMode);
    },
    [setAccentColor, contrastMode, hapticEnabled]
  );

  // Handle contrast mode change
  const handleContrastChange = useCallback(
    (mode: ContrastMode) => {
      if (hapticEnabled) triggerHaptic('light');
      setContrastMode(mode);
      applyContrastMode(mode);
      if (accentColor) {
        applyAccentColor(accentColor, mode);
      }
    },
    [setContrastMode, accentColor, hapticEnabled]
  );

  // Handle preset selection with haptic
  const handlePresetSelect = useCallback(
    (presetId: ThemePreset) => {
      if (hapticEnabled) triggerHaptic('medium');
      setSelectedSeasonal(null);
      const preset = THEME_PRESETS[presetId as keyof typeof THEME_PRESETS];
      if (preset) {
        applyThemePreset({
          preset: presetId,
          accentColor: preset.accentColor,
          theme: preset.prefersDark ? 'dark' : theme,
        });
        applyAccentColor(preset.accentColor, contrastMode);
      }
    },
    [applyThemePreset, theme, contrastMode, hapticEnabled]
  );

  // Handle seasonal preset selection
  const handleSeasonalSelect = useCallback(
    (seasonal: SeasonalPreset) => {
      if (hapticEnabled) triggerHaptic('medium');
      setSelectedSeasonal(seasonal.id);
      setAccentColor(seasonal.accentColor);
      applyAccentColor(seasonal.accentColor, contrastMode);
    },
    [setAccentColor, contrastMode, hapticEnabled]
  );

  // Handle reduced motion toggle
  const handleReducedMotionToggle = useCallback(() => {
    if (hapticEnabled) triggerHaptic('light');
    setReducedMotion(!reducedMotion);
  }, [setReducedMotion, reducedMotion, hapticEnabled]);

  // Handle font scale change
  const handleFontScaleChange = useCallback(
    (scale: FontScale) => {
      if (hapticEnabled) triggerHaptic('light');
      setFontScale(scale);
      localStorage.setItem(FONT_SCALE_KEY, scale);
      applyFontScale(scale);
    },
    [hapticEnabled]
  );

  // Handle haptic toggle
  const handleHapticToggle = useCallback(() => {
    const newValue = !hapticEnabled;
    setHapticEnabled(newValue);
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(newValue));
    if (newValue) {
      triggerHaptic('medium');
    }
  }, [hapticEnabled]);

  // Handle color blindness mode change
  const handleColorBlindnessChange = useCallback(
    (mode: ColorBlindnessMode) => {
      if (hapticEnabled) triggerHaptic('light');
      setColorBlindness(mode);
      localStorage.setItem(COLOR_BLINDNESS_KEY, mode);
      applyColorBlindnessMode(mode);
    },
    [hapticEnabled]
  );

  return {
    theme,
    accentColor,
    contrastMode,
    themePreset,
    reducedMotion,
    hapticEnabled,
    fontScale,
    colorBlindness,
    selectedSeasonal,
    handleAccentChange,
    handleContrastChange,
    handlePresetSelect,
    handleSeasonalSelect,
    handleReducedMotionToggle,
    handleFontScaleChange,
    handleHapticToggle,
    handleColorBlindnessChange,
  };
}
