import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import type { ReactNode } from "react";

interface PremiumToastProps {
  children: ReactNode;
  variant?: "success" | "error" | "info" | "default";
  onClose?: () => void;
  /** Accessible name for the dismiss control. Required whenever `onClose` is
   * set: it is user-facing copy, and defaulting it to English would be wrong in
   * all 20 other locales. */
  closeLabel?: string;
  className?: string;
}

const variantStyles = {
  success: {
    container: "border-green-500/30 bg-green-50 dark:bg-green-950/30",
    icon: <CheckCircle className="size-5 text-green-600 dark:text-green-400" />,
  },
  error: {
    container: "border-red-500/30 bg-red-50 dark:bg-red-950/30",
    icon: <AlertCircle className="size-5 text-red-600 dark:text-red-400" />,
  },
  info: {
    container: "border-blue-500/30 bg-blue-50 dark:bg-blue-950/30",
    icon: <Info className="size-5 text-blue-600 dark:text-blue-400" />,
  },
  default: {
    container: "border-border bg-background",
    icon: null,
  },
};

export function PremiumToast({ children, variant = "default", onClose, closeLabel, className }: PremiumToastProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-[slide-up_0.3s_ease-out]",
        styles.container,
        className,
      )}
      role="alert"
    >
      {styles.icon && <div className="shrink-0 mt-0.5">{styles.icon}</div>}
      <div className="flex-1 text-sm text-foreground">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={closeLabel}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
