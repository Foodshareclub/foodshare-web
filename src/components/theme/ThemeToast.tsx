'use client';

/**
 * ThemeToast Component
 * Beautiful toast notifications for theme changes
 */

import React, { memo, useEffect, useState, createContext, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface ThemeToastData {
  id: string;
  type: "theme" | "accent" | "preset" | "contrast" | "schedule";
  message: string;
  icon?: React.ReactNode;
  color?: string;
}

interface ThemeToastContextType {
  showToast: (toast: Omit<ThemeToastData, "id">) => void;
}

// ============================================================================
// Context
// ============================================================================

const ThemeToastContext = createContext<ThemeToastContextType | null>(null);

export const useThemeToast = () => {
  const context = useContext(ThemeToastContext);
  if (!context) {
    throw new Error("useThemeToast must be used within ThemeToastProvider");
  }
  return context;
};

// ============================================================================
// Icons
// ============================================================================

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

const PaletteIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
    <path d="M19 15l.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9.9-2.7z" />
  </svg>
);

const ContrastIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

// ============================================================================
// Toast Item Component
// ============================================================================

const ToastItem: React.FC<{
  toast: ThemeToastData;
  onDismiss: () => void;
}> = memo(({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = () => {
    if (toast.icon) return toast.icon;
    switch (toast.type) {
      case "theme":
        return toast.message.includes("Dark") ? <MoonIcon /> : <SunIcon />;
      case "accent":
        return <PaletteIcon />;
      case "preset":
        return <SparklesIcon />;
      case "contrast":
        return <ContrastIcon />;
      case "schedule":
        return <ClockIcon />;
      default:
        return <SparklesIcon />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg",
        "bg-background/95 backdrop-blur-xl border border-border/50",
        "cursor-pointer hover:scale-[1.02] transition-transform"
      )}
      onClick={onDismiss}
    >
      {/* Icon with animated background */}
      <motion.div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl",
          "bg-gradient-to-br from-primary/20 to-primary/5"
        )}
        style={toast.color ? { backgroundColor: `${toast.color}20` } : undefined}
        initial={{ rotate: -10 }}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <span className="text-primary" style={toast.color ? { color: toast.color } : undefined}>
          {getIcon()}
        </span>
      </motion.div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <motion.p
          className="text-sm font-medium text-foreground truncate"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {toast.message}
        </motion.p>
      </div>

      {/* Animated progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-primary/30 rounded-full"
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 2.5, ease: "linear" }}
      />
    </motion.div>
  );
});

ToastItem.displayName = "ToastItem";

// ============================================================================
// Toast Container
// ============================================================================

const ToastContainer: React.FC<{
  toasts: ThemeToastData[];
  onDismiss: (id: string) => void;
}> = memo(({ toasts, onDismiss }) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </AnimatePresence>
  </div>
));

ToastContainer.displayName = "ToastContainer";

// ============================================================================
// Provider
// ============================================================================

export const ThemeToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ThemeToastData[]>([]);

  const showToast = useCallback((toast: Omit<ThemeToastData, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]); // Keep max 3 toasts
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ThemeToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ThemeToastContext.Provider>
  );
};

// ============================================================================
// Utility Hook for Theme Changes
// ============================================================================

export const useThemeChangeToast = () => {
  const { showToast } = useThemeToast();

  return {
    showThemeChange: (isDark: boolean) => {
      showToast({
        type: "theme",
        message: isDark ? "Dark mode enabled" : "Light mode enabled",
      });
    },
    showAccentChange: (colorName: string, colorHex?: string) => {
      showToast({
        type: "accent",
        message: `Accent: ${colorName}`,
        color: colorHex,
      });
    },
    showPresetChange: (presetName: string) => {
      showToast({
        type: "preset",
        message: `Theme: ${presetName}`,
      });
    },
    showContrastChange: (mode: string) => {
      showToast({
        type: "contrast",
        message: `Contrast: ${mode}`,
      });
    },
    showScheduleChange: (enabled: boolean) => {
      showToast({
        type: "schedule",
        message: enabled ? "Schedule enabled" : "Schedule disabled",
      });
    },
  };
};
