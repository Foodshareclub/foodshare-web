"use client";

import { motion } from "framer-motion";
import { X, Heart, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./animations";

interface ActionButtonsProps {
  onSkip: () => void;
  onAccept: () => void;
  onShuffle?: () => void;
  disabled?: boolean;
  showShuffle?: boolean;
}

export function ActionButtons({
  onSkip,
  onAccept,
  onShuffle,
  disabled = false,
  showShuffle = true,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      {/* Skip Button */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover={disabled ? undefined : "hover"}
        whileTap={disabled ? undefined : "tap"}
        onClick={onSkip}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-card/80 backdrop-blur-sm",
          "border-2 border-red-500/50",
          "text-red-500",
          "shadow-lg shadow-red-500/10",
          "transition-colors duration-200",
          "hover:bg-red-500/10 hover:border-red-500",
          "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Skip challenge"
      >
        <X className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      {/* Shuffle Button (optional) */}
      {showShuffle && onShuffle && (
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover={disabled ? undefined : "hover"}
          whileTap={disabled ? undefined : "tap"}
          onClick={onShuffle}
          disabled={disabled}
          className={cn(
            "flex items-center justify-center",
            "w-12 h-12 rounded-full",
            "bg-card/80 backdrop-blur-sm",
            "border-2 border-primary/50",
            "text-primary",
            "shadow-lg shadow-primary/10",
            "transition-colors duration-200",
            "hover:bg-primary/10 hover:border-primary",
            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Shuffle deck"
        >
          <RotateCcw className="w-5 h-5" />
        </motion.button>
      )}

      {/* Accept Button */}
      <motion.button
        variants={buttonVariants}
        initial="initial"
        whileHover={disabled ? undefined : "hover"}
        whileTap={disabled ? undefined : "tap"}
        onClick={onAccept}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center",
          "w-14 h-14 rounded-full",
          "bg-gradient-to-br from-green-500 to-emerald-600",
          "border-2 border-green-400",
          "text-white",
          "shadow-lg shadow-green-500/30",
          "transition-all duration-200",
          "hover:shadow-xl hover:shadow-green-500/40",
          "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-2 focus:ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Accept challenge"
      >
        <Heart className="w-6 h-6 fill-current" />
      </motion.button>
    </div>
  );
}

// Keyboard hint component
export function KeyboardHints() {
  return (
    <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded bg-muted/50 border border-border font-mono">←</kbd>
        <span>Skip</span>
      </div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded bg-muted/50 border border-border font-mono">→</kbd>
        <span>Accept</span>
      </div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded bg-muted/50 border border-border font-mono">Esc</kbd>
        <span>Close</span>
      </div>
    </div>
  );
}

export default ActionButtons;
