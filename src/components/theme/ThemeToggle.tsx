"use client";

/**
 * ThemeToggle Component
 * Beautiful animated dark/light mode switcher with dropdown
 * Uses pure CSS animations for optimal performance (no Framer Motion)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/hooks";
import { cn } from "@/lib/utils";
import type { Theme } from "@/store/zustand/useUIStore";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showDropdown?: boolean;
}

const sizeClasses = {
  sm: "w-14 h-7",
  md: "w-16 h-8",
  lg: "w-20 h-10",
};

const knobSizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-5 h-5",
};

const knobTranslate = {
  sm: 28,
  md: 32,
  lg: 40,
};

// Sun icon with animated rays (CSS animation)
const SunIcon: React.FC<{ className?: string; animate?: boolean }> = ({
  className,
  animate = false,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className, animate && "animate-spin-slow")}
    style={animate ? { animationDuration: "20s" } : undefined}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

// Moon icon with craters
const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

// Monitor icon for system theme
const MonitorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

// Animated stars for dark mode with shooting stars (CSS animations)
const Stars: React.FC = () => (
  <>
    {/* Twinkling stars with CSS animation */}
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-white animate-twinkle"
        style={{
          width: i % 2 === 0 ? 2 : 1.5,
          height: i % 2 === 0 ? 2 : 1.5,
          top: `${15 + ((i * 17) % 60)}%`,
          left: `${10 + ((i * 23) % 50)}%`,
          animationDelay: `${i * 0.4}s`,
        }}
      />
    ))}
    {/* Shooting star with CSS animation */}
    <div
      className="absolute w-0.5 h-0.5 bg-white rounded-full animate-shooting-star"
      style={{ top: "20%", left: "60%" }}
    >
      <div
        className="absolute w-4 h-0.5 bg-gradient-to-r from-white to-transparent rounded-full"
        style={{ right: "100%", top: "0" }}
      />
    </div>
  </>
);

// Animated clouds for light mode with birds (CSS animations)
const Clouds: React.FC = () => (
  <>
    {/* Fluffy cloud 1 */}
    <div className="absolute animate-cloud-drift" style={{ top: "22%", left: "12%" }}>
      <div className="relative">
        <div className="absolute rounded-full bg-white/60" style={{ width: 8, height: 5 }} />
        <div
          className="absolute rounded-full bg-white/50"
          style={{ width: 6, height: 4, top: -2, left: 4 }}
        />
        <div
          className="absolute rounded-full bg-white/55"
          style={{ width: 5, height: 3, top: 1, left: 7 }}
        />
      </div>
    </div>
    {/* Fluffy cloud 2 */}
    <div
      className="absolute animate-cloud-drift-reverse"
      style={{ top: "55%", left: "22%", animationDelay: "0.5s" }}
    >
      <div className="relative">
        <div className="absolute rounded-full bg-white/50" style={{ width: 7, height: 4 }} />
        <div
          className="absolute rounded-full bg-white/45"
          style={{ width: 5, height: 3, top: -1, left: 3 }}
        />
      </div>
    </div>
    {/* Flying bird silhouette */}
    <div className="absolute animate-bird-fly" style={{ top: "35%", left: "45%" }}>
      <svg width="6" height="3" viewBox="0 0 6 3" className="text-slate-600/40">
        <path
          d="M0 1.5 Q1.5 0 3 1.5 Q4.5 0 6 1.5"
          stroke="currentColor"
          fill="none"
          strokeWidth="0.5"
        />
      </svg>
    </div>
    {/* Sun lens flare */}
    <div
      className="absolute rounded-full animate-pulse-glow"
      style={{
        width: 6,
        height: 6,
        top: "40%",
        left: "8%",
        background: "radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%)",
      }}
    />
  </>
);

// Dropdown menu item (CSS transitions)
const ThemeMenuItem: React.FC<{
  theme: Theme;
  currentTheme: Theme;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ theme, currentTheme, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium",
      "transition-all duration-150 ease-out",
      "hover:translate-x-1 active:scale-[0.98]",
      currentTheme === theme
        ? "bg-primary/10 text-primary dark:bg-primary/20"
        : "hover:bg-muted text-foreground/80 hover:text-foreground"
    )}
  >
    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
    <span>{label}</span>
    {currentTheme === theme && (
      <div className="ml-auto animate-scale-in">
        <svg
          className="w-4 h-4 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )}
  </button>
);

// Main Toggle Component
function ThemeToggle({ className, size = "md", showDropdown = true }: ThemeToggleProps) {
  const { theme, isDark, toggleTheme, setTheme, isSystem } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-toggle]")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcut: Ctrl/Cmd + Shift + L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        toggleTheme();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleTheme]);

  const handleToggleClick = useCallback(() => {
    if (showDropdown) {
      setIsOpen((prev) => !prev);
    } else {
      toggleTheme();
    }
  }, [showDropdown, toggleTheme]);

  const handleThemeSelect = useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme);
      setIsOpen(false);
    },
    [setTheme]
  );

  return (
    <div className="relative" data-theme-toggle>
      {/* Main Toggle Button - CSS transitions replace Framer Motion */}
      <button
        onClick={handleToggleClick}
        className={cn(
          "relative rounded-full p-0.5 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background shadow-lg",
          "transition-all duration-200 ease-out",
          "hover:scale-105 active:scale-95",
          isDark
            ? "hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            : "hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]",
          sizeClasses[size],
          className
        )}
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)"
            : "linear-gradient(135deg, #38bdf8 0%, #60a5fa 50%, #818cf8 100%)",
        }}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-expanded={isOpen}
        title="Toggle theme (Ctrl+Shift+L)"
      >
        {/* Background Effects - CSS fade transitions */}
        <div
          className={cn(
            "absolute inset-0 overflow-hidden transition-opacity duration-300",
            isDark ? "opacity-100" : "opacity-0"
          )}
        >
          <Stars />
          {/* Moon glow */}
          <div
            className="absolute rounded-full bg-blue-400/20 blur-md animate-pulse-glow"
            style={{ width: 20, height: 20, top: "20%", right: "10%" }}
          />
        </div>
        <div
          className={cn(
            "absolute inset-0 overflow-hidden transition-opacity duration-300",
            isDark ? "opacity-0" : "opacity-100"
          )}
        >
          <Clouds />
          {/* Sun rays */}
          <div
            className="absolute rounded-full bg-yellow-300/30 blur-sm animate-sun-pulse"
            style={{ width: 16, height: 16, top: "30%", left: "5%" }}
          />
        </div>

        {/* Toggle Knob - CSS spring-like transition */}
        <div
          className={cn(
            "relative z-10 flex items-center justify-center rounded-full shadow-xl",
            "transition-transform duration-300",
            knobSizeClasses[size]
          )}
          style={{
            transform: `translateX(${isDark ? knobTranslate[size] : 0}px)`,
            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Spring-like
            background: isDark
              ? "linear-gradient(145deg, #475569, #334155)"
              : "linear-gradient(145deg, #fef3c7, #fbbf24)",
            boxShadow: isDark
              ? "inset 2px 2px 4px rgba(255,255,255,0.1), inset -2px -2px 4px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)"
              : "inset 2px 2px 4px rgba(255,255,255,0.8), inset -2px -2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(251,191,36,0.5)",
          }}
        >
          {/* Icon with CSS transition */}
          <div
            className={cn(
              "transition-all duration-250",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0 absolute"
            )}
          >
            <MoonIcon className={cn(iconSizeClasses[size], "text-blue-200")} />
          </div>
          <div
            className={cn(
              "transition-all duration-250",
              isDark ? "opacity-0 -rotate-90 scale-0 absolute" : "opacity-100 rotate-0 scale-100"
            )}
          >
            <SunIcon className={cn(iconSizeClasses[size], "text-amber-600")} animate />
          </div>
        </div>

        {/* System indicator dot */}
        {isSystem && (
          <div
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background animate-scale-in"
            title="Following system preference"
          />
        )}
      </button>

      {/* Dropdown Menu - CSS animation */}
      {isOpen && showDropdown && (
        <div
          className={cn(
            "absolute right-0 mt-2 w-48 py-2 bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 z-50",
            "animate-dropdown-in"
          )}
        >
          <div className="px-3 pb-2 mb-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Theme
            </p>
          </div>
          <div className="px-1 space-y-0.5">
            <ThemeMenuItem
              theme="light"
              currentTheme={theme}
              label="Light"
              icon={<SunIcon className="w-4 h-4 text-amber-500" />}
              onClick={() => handleThemeSelect("light")}
            />
            <ThemeMenuItem
              theme="dark"
              currentTheme={theme}
              label="Dark"
              icon={<MoonIcon className="w-4 h-4 text-blue-400" />}
              onClick={() => handleThemeSelect("dark")}
            />
            <ThemeMenuItem
              theme="system"
              currentTheme={theme}
              label="System"
              icon={<MonitorIcon className="w-4 h-4 text-muted-foreground" />}
              onClick={() => handleThemeSelect("system")}
            />
          </div>
          <div className="px-3 pt-2 mt-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Shift</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">L</kbd>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple inline toggle for mobile drawer (CSS transitions)
function ThemeToggleInline({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <SunIcon className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <MoonIcon className="w-4 h-4" /> },
    { value: "system", label: "Auto", icon: <MonitorIcon className="w-4 h-4" /> },
  ];

  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-xl", className)}>
      {themes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
            "transition-all duration-150 ease-out",
            "hover:scale-[1.02] active:scale-[0.98]",
            theme === value
              ? "bg-background text-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export { ThemeToggle, ThemeToggleInline, SunIcon, MoonIcon, MonitorIcon };
