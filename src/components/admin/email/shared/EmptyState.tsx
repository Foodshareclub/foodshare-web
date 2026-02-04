"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  message,
  title,
  description,
  action,
  className,
}: {
  icon: React.ReactNode;
  /** Simple message (use this OR title/description) */
  message?: string;
  /** Title text (alternative to message) */
  title?: string;
  /** Description text (used with title) */
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("flex flex-col items-center justify-center py-12 text-center px-4", className)}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative"
      >
        <div className="rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 p-4 mb-4 text-muted-foreground shadow-inner">
          {icon}
        </div>
        {/* Decorative ring */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-border/20" />
      </motion.div>

      {message && <p className="text-muted-foreground max-w-xs">{message}</p>}

      {title && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-semibold text-foreground"
        >
          {title}
        </motion.p>
      )}

      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground mt-1.5 max-w-xs"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

export function QuickTemplateButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 rounded-xl",
        "border border-border/50 bg-card/50",
        "hover:bg-card hover:border-border hover:shadow-sm",
        "transition-all duration-200",
        "flex items-center gap-3"
      )}
    >
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
