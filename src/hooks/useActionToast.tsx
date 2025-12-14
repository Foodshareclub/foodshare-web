"use client";

/**
 * useActionToast - Lightweight toast notifications for server action feedback
 * Follows the existing ThemeToast pattern but for general action results
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ActionToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

// ============================================================================
// Context
// ============================================================================

const ActionToastContext = createContext<ActionToastContextType | null>(null);

export function useActionToast(): ActionToastContextType {
  const context = useContext(ActionToastContext);
  if (!context) {
    throw new Error("useActionToast must be used within ActionToastProvider");
  }
  return context;
}

// ============================================================================
// Toast Item
// ============================================================================

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; className: string }> = {
  success: {
    icon: <CheckCircle className="h-5 w-5" />,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5" />,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}): React.ReactElement {
  const config = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-xl min-w-[280px] max-w-[400px]",
        config.className
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.description && <p className="text-xs opacity-80 mt-0.5">{toast.description}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// ============================================================================
// Provider
// ============================================================================

export function ActionToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev.slice(-4), { ...options, id }]); // Keep max 5 toasts
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue: ActionToastContextType = {
    toast: addToast,
    success: (title, description) => addToast({ type: "success", title, description }),
    error: (title, description) => addToast({ type: "error", title, description }),
    warning: (title, description) => addToast({ type: "warning", title, description }),
    info: (title, description) => addToast({ type: "info", title, description }),
  };

  return (
    <ActionToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={() => dismissToast(toast.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ActionToastContext.Provider>
  );
}
