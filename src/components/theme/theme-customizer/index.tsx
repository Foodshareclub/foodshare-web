'use client';

import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AccentColorConfig, ContrastMode, ThemePreset } from '@/store/zustand/useUIStore';
import {
  THEME_PRESETS,
  SEASONAL_PRESETS,
  getCurrentSeasonalPreset,
  type FontScale,
  type SeasonalPreset,
  type ColorBlindnessMode,
} from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';

import { useThemeCustomization } from './hooks';
import { AccentColorPicker } from './AccentColorPicker';
import { PresetCard } from './PresetCard';
import { SeasonalPresetCard } from './SeasonalPresetCard';
import { FontScaleSelector } from './FontScaleSelector';
import { ColorBlindnessSelector } from './ColorBlindnessSelector';
import { ContrastSelector } from './ContrastSelector';
import {
  PaletteIcon,
  SparklesIcon,
  ContrastIcon,
  AccessibilityIcon,
  TextSizeIcon,
  MotionIcon,
  HapticIcon,
  EyeIcon,
} from './icons';

const currentSeasonalPreset = getCurrentSeasonalPreset();

interface ThemeCustomizerProps {
  className?: string;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = memo(({ className }) => {
  const {
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
  } = useThemeCustomization();

  const [activeTab, setActiveTab] = useState<'presets' | 'colors' | 'accessibility'>('presets');

  const tabs = [
    { id: 'presets' as const, label: 'Presets', icon: <SparklesIcon /> },
    { id: 'colors' as const, label: 'Colors', icon: <PaletteIcon /> },
    { id: 'accessibility' as const, label: 'Accessibility', icon: <AccessibilityIcon /> },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'presets' && (
          <PresetsTab
            themePreset={themePreset}
            selectedSeasonal={selectedSeasonal}
            onPresetSelect={handlePresetSelect}
            onSeasonalSelect={handleSeasonalSelect}
          />
        )}

        {activeTab === 'colors' && (
          <ColorsTab accentColor={accentColor} onAccentChange={handleAccentChange} />
        )}

        {activeTab === 'accessibility' && (
          <AccessibilityTab
            fontScale={fontScale}
            contrastMode={contrastMode}
            reducedMotion={reducedMotion}
            hapticEnabled={hapticEnabled}
            colorBlindness={colorBlindness}
            onFontScaleChange={handleFontScaleChange}
            onContrastChange={handleContrastChange}
            onReducedMotionToggle={handleReducedMotionToggle}
            onHapticToggle={handleHapticToggle}
            onColorBlindnessChange={handleColorBlindnessChange}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

ThemeCustomizer.displayName = 'ThemeCustomizer';

// Presets Tab Component
interface PresetsTabProps {
  themePreset: ThemePreset;
  selectedSeasonal: string | null;
  onPresetSelect: (presetId: ThemePreset) => void;
  onSeasonalSelect: (seasonal: SeasonalPreset) => void;
}

const PresetsTab: React.FC<PresetsTabProps> = memo(
  ({ themePreset, selectedSeasonal, onPresetSelect, onSeasonalSelect }) => (
    <motion.div
      key="presets"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Seasonal Themes Section */}
      {SEASONAL_PRESETS.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <span className="text-lg">{currentSeasonalPreset?.emoji || ''}</span>
            Seasonal Themes
            {currentSeasonalPreset && (
              <span className="ml-auto text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                In Season
              </span>
            )}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {SEASONAL_PRESETS.map((seasonal) => (
              <SeasonalPresetCard
                key={seasonal.id}
                preset={seasonal}
                isActive={selectedSeasonal === seasonal.id}
                onClick={() => onSeasonalSelect(seasonal)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Classic Presets Section */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <SparklesIcon />
          Classic Themes
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Choose a theme preset for a coordinated look
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.values(THEME_PRESETS).map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={themePreset === preset.id && !selectedSeasonal}
              onClick={() => onPresetSelect(preset.id as ThemePreset)}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
);

PresetsTab.displayName = 'PresetsTab';

// Colors Tab Component
interface ColorsTabProps {
  accentColor: AccentColorConfig;
  onAccentChange: (color: AccentColorConfig) => void;
}

const ColorsTab: React.FC<ColorsTabProps> = memo(({ accentColor, onAccentChange }) => (
  <motion.div
    key="colors"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-4"
  >
    <div>
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <PaletteIcon />
        Accent Color
      </h4>
      <p className="text-sm text-muted-foreground mb-4">Personalize with your favorite color</p>
      <AccentColorPicker current={accentColor} onChange={onAccentChange} />
    </div>
  </motion.div>
));

ColorsTab.displayName = 'ColorsTab';

// Accessibility Tab Component
interface AccessibilityTabProps {
  fontScale: FontScale;
  contrastMode: ContrastMode;
  reducedMotion: boolean;
  hapticEnabled: boolean;
  colorBlindness: ColorBlindnessMode;
  onFontScaleChange: (scale: FontScale) => void;
  onContrastChange: (mode: ContrastMode) => void;
  onReducedMotionToggle: () => void;
  onHapticToggle: () => void;
  onColorBlindnessChange: (mode: ColorBlindnessMode) => void;
}

const AccessibilityTab: React.FC<AccessibilityTabProps> = memo(
  ({
    fontScale,
    contrastMode,
    reducedMotion,
    hapticEnabled,
    colorBlindness,
    onFontScaleChange,
    onContrastChange,
    onReducedMotionToggle,
    onHapticToggle,
    onColorBlindnessChange,
  }) => (
    <motion.div
      key="accessibility"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Font Scale */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <TextSizeIcon />
          Text Size
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Adjust text size for better readability
        </p>
        <FontScaleSelector current={fontScale} onChange={onFontScaleChange} />
      </div>

      {/* Contrast Mode */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <ContrastIcon />
          Contrast
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Adjust color contrast for better visibility
        </p>
        <ContrastSelector current={contrastMode} onChange={onContrastChange} />
      </div>

      {/* Reduced Motion */}
      <ToggleOption
        icon={<MotionIcon />}
        title="Reduce Motion"
        description="Minimize animations for accessibility"
        isEnabled={reducedMotion}
        onToggle={onReducedMotionToggle}
      />

      {/* Haptic Feedback */}
      <ToggleOption
        icon={<HapticIcon />}
        title="Haptic Feedback"
        description="Vibration feedback on mobile devices"
        isEnabled={hapticEnabled}
        onToggle={onHapticToggle}
      />

      {/* Color Blindness Simulation */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <EyeIcon />
          Color Vision
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Simulate different types of color vision
        </p>
        <ColorBlindnessSelector current={colorBlindness} onChange={onColorBlindnessChange} />
      </div>
    </motion.div>
  )
);

AccessibilityTab.displayName = 'AccessibilityTab';

// Toggle Option Component
interface ToggleOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isEnabled: boolean;
  onToggle: () => void;
}

const ToggleOption: React.FC<ToggleOptionProps> = memo(
  ({ icon, title, description, isEnabled, onToggle }) => (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <p className="font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div
          className={cn(
            'w-12 h-7 rounded-full p-1 transition-colors',
            isEnabled ? 'bg-primary' : 'bg-muted'
          )}
        >
          <motion.div
            className="w-5 h-5 bg-white rounded-full shadow-md"
            animate={{ x: isEnabled ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </div>
      </button>
    </div>
  )
);

ToggleOption.displayName = 'ToggleOption';

export { ThemeCustomizer };
