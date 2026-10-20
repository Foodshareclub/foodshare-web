"use client";

/**
 * Toast notifications for server-action feedback.
 *
 * Four things were wrong with this component, and they are fixed together here
 * because they are the same component:
 *
 * 1. It pulled `framer-motion` into the root layout, and therefore into the
 *    first-load bundle of *every* route — measured at 131 KB raw / 45 KB gzip
 *    for a fade. `tw-animate-css` is already loaded globally and gives the same
 *    enter/exit for free, so the dependency is gone from the shell entirely.
 *
 * 2. Nothing was announced. The container had no live region and the items had
 *    no `role`, so a screen-reader user got no feedback at all from any of the
 *    ~20 `toast.success/error(...)` call sites — this is WCAG 4.1.3, and it is
 *    the app's primary async-feedback channel. The container is now a live
 *    region that is present before any toast arrives, which is what makes the
 *    addition observable; errors are `role="alert"` so they interrupt.
 *
 * 3. The dismiss button was an icon with no accessible name (WCAG 4.1.2), and
 *    toasts auto-dismissed after a flat 4 s with no way to hold them (WCAG
 *    2.2.1). An error message that vanishes before it can be read or re-read
 *    is not an error message. Timers now pause on hover *and* on focus, and
 *    errors stay up long enough to act on.
 *
 * 4. Positioning was physical (`right-4`, and an exit that slid out to the
 *    right), so the whole thing was mirrored wrong in Arabic. It uses logical
 *    properties now.
 */

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

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

const ActionToastContext = createContext<ActionToastContextType | null>(null);

export function useActionToast(): ActionToastContextType {
  const context = useContext(ActionToastContext);
  if (!context) {
    throw new Error("useActionToast must be used within ActionToastProvider");
  }
  return context;
}

/** How long a toast stays up. Errors get longer: they usually need acting on. */
const TOAST_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 10000,
};

const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; className: string; dismissLabel: string }> = {
  success: {
    icon: <CheckCircle className="h-5 w-5" />,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dismissLabel: "Dismiss notification",
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dismissLabel: "Dismiss error",
  },
  warning: {
    icon: <AlertCircle className="h-5 w-5" />,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dismissLabel: "Dismiss warning",
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dismissLabel: "Dismiss notification",
  },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }): React.ReactElement {
  const config = TOAST_CONFIG[toast.type];
  const remaining = useRef(TOAST_DURATION_MS[toast.type]);
  const startedAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // `clearTimer` and `onDismiss` are deliberately omitted — `onDismiss` is a
  // fresh closure per render from the provider's map, so including it would
  // restart the timer on every render of the list, and `clearTimer` only
  // touches a ref.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — see above
  const startTimer = React.useCallback((ms: number) => {
    clearTimer();
    timer.current = setTimeout(onDismiss, ms);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Hold the toast while a pointer is on it or it has keyboard focus. */
  // `clearTimer` only touches a ref, so it is stable for the lifetime of the toast.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — see above
  const pause = React.useCallback(() => {
    if (timer.current === null) return;
    clearTimer();
    // Credit the time already spent, so pausing does not extend the total
    // beyond the intended duration by the length of the pause.
    remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
  }, []);

  const resume = React.useCallback(() => {
    startedAt.current = Date.now();
    startTimer(remaining.current);
  }, [startTimer]);

  // `clearTimer` is returned as the teardown and only touches a ref.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate — see above
  React.useEffect(() => {
    startTimer(remaining.current);
    return clearTimer;
  }, [startTimer]);

  return (
    <div
      // `alert` for errors so they interrupt; `status` for everything else so
      // they queue politely. The container is the live region, so this is the
      // per-item semantics rather than a second announcement.
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl",
        "min-w-[280px] max-w-[400px]",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-200",
        config.className,
      )}
    >
      <span className="mt-0.5 flex-shrink-0" aria-hidden="true">
        {config.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={config.dismissLabel}
        className="flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ActionToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: Omit<Toast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev.slice(-4), { ...options, id }]);
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
      {/*
        The live region is rendered unconditionally, before any toast exists.
        A live region that is inserted into the DOM at the same moment as its
        content is not reliably announced — assistive technology registers the
        region when it appears, and misses content that arrives with it.

        `end-4` rather than `right-4`, so the stack sits on the correct side in
        right-to-left locales.
      */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-relevant="additions text"
        className="pointer-events-none fixed bottom-4 end-4 z-[100] flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ActionToastContext.Provider>
  );
}
