/**
 * ThemeSettingsPanel Component
 * Advanced theme configuration with scheduling, transitions, and previews
 * Uses Zustand instead of Redux for theme state management
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useUIStore,
  type Theme,
  type ThemeSchedule,
  type ThemeTransition,
} from "@/store/zustand/useUIStore";
import { cn } from "@/lib/utils";

// Icons
const SunIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MonitorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 15l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9.9-2.7z" />
  </svg>
);

// Theme option card
const ThemeOption: React.FC<{
  value: Theme;
  current: Theme;
  label: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  onClick: () => void;
}> = ({ value, current, label, description, icon, preview, onClick }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left w-full",
      current === value
        ? "border-primary bg-primary/5 dark:bg-primary/10"
        : "border-border hover:border-primary/50 bg-card"
    )}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    {/* Preview */}
    <div className="w-full h-20 rounded-xl overflow-hidden mb-3 border border-border/50">
      {preview}
    </div>

    <div className="flex items-center gap-2 mb-1">
      <span
        className={cn(
          "transition-colors",
          current === value ? "text-primary" : "text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
    </div>
    <p className="text-xs text-muted-foreground">{description}</p>

    {/* Selection indicator */}
    {current === value && (
      <motion.div
        className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <svg
          className="w-4 h-4 text-primary-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    )}
  </motion.button>
);

// Light theme preview
const LightPreview = () => (
  <div className="w-full h-full bg-gradient-to-br from-sky-100 to-blue-200 p-2">
    <div className="flex gap-1 mb-1">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      <div className="w-2 h-2 rounded-full bg-yellow-400" />
      <div className="w-2 h-2 rounded-full bg-green-400" />
    </div>
    <div className="space-y-1">
      <div className="h-2 w-3/4 bg-gray-300 rounded" />
      <div className="h-2 w-1/2 bg-gray-300 rounded" />
    </div>
    <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-400 rounded-full shadow-lg" />
  </div>
);

// Dark theme preview
const DarkPreview = () => (
  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 p-2 relative overflow-hidden">
    <div className="flex gap-1 mb-1">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <div className="w-2 h-2 rounded-full bg-yellow-500" />
      <div className="w-2 h-2 rounded-full bg-green-500" />
    </div>
    <div className="space-y-1">
      <div className="h-2 w-3/4 bg-slate-600 rounded" />
      <div className="h-2 w-1/2 bg-slate-600 rounded" />
    </div>
    {/* Stars */}
    <div className="absolute top-3 right-3 w-1 h-1 bg-white rounded-full" />
    <div className="absolute top-5 right-6 w-0.5 h-0.5 bg-white rounded-full" />
    <div className="absolute top-2 right-8 w-0.5 h-0.5 bg-white rounded-full" />
    <div className="absolute top-4 right-2 w-4 h-4 bg-slate-300 rounded-full" />
  </div>
);

// System theme preview
const SystemPreview = () => (
  <div className="w-full h-full flex overflow-hidden rounded-lg">
    <div className="w-1/2 bg-gradient-to-br from-sky-100 to-blue-200 p-1.5">
      <div className="h-1.5 w-3/4 bg-gray-300 rounded mb-1" />
      <div className="h-1.5 w-1/2 bg-gray-300 rounded" />
    </div>
    <div className="w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-1.5">
      <div className="h-1.5 w-3/4 bg-slate-600 rounded mb-1" />
      <div className="h-1.5 w-1/2 bg-slate-600 rounded" />
    </div>
  </div>
);

// Transition option
const TransitionOption: React.FC<{
  value: "instant" | "smooth" | "radial";
  current: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ value, current, label, icon, onClick }) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
      current === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
    )}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    <span className={current === value ? "text-primary" : "text-muted-foreground"}>{icon}</span>
    <span className="text-xs font-medium">{label}</span>
  </motion.button>
);

// Main Panel Component
function ThemeSettingsPanel({ className }: { className?: string }) {
  // Zustand store (replaces Redux)
  const {
    theme,
    themeSchedule: schedule,
    themeTransition: transition,
    setTheme,
    setThemeSchedule,
    setThemeTransition,
  } = useUIStore();

  const [showSchedule, setShowSchedule] = useState(schedule?.enabled || false);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleTransitionChange = (newTransition: ThemeTransition) => {
    setThemeTransition(newTransition);
  };

  const handleScheduleToggle = () => {
    const newEnabled = !showSchedule;
    setShowSchedule(newEnabled);
    setThemeSchedule({ enabled: newEnabled });
  };

  const handleScheduleChange = (field: keyof ThemeSchedule, value: string) => {
    setThemeSchedule({ [field]: value });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SparklesIcon />
          &quot;Appearance&quot;
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemeOption
            value="light"
            current={theme}
            label="Light"
            description="Bright and clean"
            icon={<SunIcon />}
            preview={<LightPreview />}
            onClick={() => handleThemeChange("light")}
          />
          <ThemeOption
            value="dark"
            current={theme}
            label="Dark"
            description="Easy on the eyes"
            icon={<MoonIcon />}
            preview={<DarkPreview />}
            onClick={() => handleThemeChange("dark")}
          />
          <ThemeOption
            value="system"
            current={theme}
            label="System"
            description="Match device settings"
            icon={<MonitorIcon />}
            preview={<SystemPreview />}
            onClick={() => handleThemeChange("system")}
          />
        </div>
      </div>

      {/* Transition Style */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">
          &quot;Transition Style&quot;
        </h4>
        <div className="flex gap-2">
          <TransitionOption
            value="instant"
            current={transition}
            label="Instant"
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
            onClick={() => handleTransitionChange("instant")}
          />
          <TransitionOption
            value="smooth"
            current={transition}
            label="Smooth"
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            }
            onClick={() => handleTransitionChange("smooth")}
          />
          <TransitionOption
            value="radial"
            current={transition}
            label="Radial"
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            }
            onClick={() => handleTransitionChange("radial")}
          />
        </div>
      </div>

      {/* Schedule */}
      <div>
        <button
          onClick={handleScheduleToggle}
          className="flex items-center justify-between w-full p-4 rounded-xl border border-border hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ClockIcon />
            <div className="text-left">
              <p className="font-medium">&quot;Schedule&quot;</p>
              <p className="text-xs text-muted-foreground">
                &quot;Auto-switch at specific times&quot;
              </p>
            </div>
          </div>
          <div
            className={cn(
              "w-12 h-7 rounded-full p-1 transition-colors",
              showSchedule ? "bg-primary" : "bg-muted"
            )}
          >
            <motion.div
              className="w-5 h-5 bg-white rounded-full shadow-md"
              animate={{ x: showSchedule ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </button>

        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    &quot;Light mode from&quot;
                  </label>
                  <input
                    type="time"
                    value={schedule?.lightStart || "07:00"}
                    onChange={(e) => handleScheduleChange("lightStart", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    &quot;Dark mode from&quot;
                  </label>
                  <input
                    type="time"
                    value={schedule?.darkStart || "19:00"}
                    onChange={(e) => handleScheduleChange("darkStart", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">Quick toggle:</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl</kbd>
        <span className="text-xs text-muted-foreground">+</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Shift</kbd>
        <span className="text-xs text-muted-foreground">+</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">L</kbd>
      </div>
    </div>
  );
}

export { ThemeSettingsPanel };
