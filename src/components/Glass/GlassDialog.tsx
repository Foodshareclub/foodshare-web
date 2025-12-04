import React from "react";
import { DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * GlassDialogContent - Glassmorphism wrapper for Dialog Content
 *
 * Provides beautiful frosted glass effect for modal dialogs with proper centering.
 */
export const GlassDialogContent: React.FC<
  React.ComponentPropsWithoutRef<typeof DialogContent> & {
    maxW?: string | Record<string, string>;
    maxH?: string;
    overflowY?: string;
    p?: string | number;
    borderRadius?: string;
  }
> = ({ children, className, maxW, maxH, overflowY, p, borderRadius, ...props }) => {
  // Convert Chakra-style maxW to Tailwind classes
  const getMaxWidthClass = () => {
    if (!maxW) return "";
    if (typeof maxW === "string") {
      // Simple string value
      return maxW.includes("px") || maxW.includes("%") ? "" : `max-w-${maxW}`;
    }
    // Responsive object - convert to Tailwind responsive classes
    if (typeof maxW === "object") {
      return Object.entries(maxW)
        .map(([breakpoint, value]) => {
          const prefix = breakpoint === "base" ? "" : `${breakpoint}:`;
          const valueStr = value as string;
          return valueStr.includes("px") || valueStr.includes("%") ? "" : `${prefix}max-w-${valueStr}`;
        })
        .filter(Boolean)
        .join(" ");
    }
    return "";
  };

  const additionalStyles: React.CSSProperties = {};
  if (maxW && typeof maxW === "string" && (maxW.includes("px") || maxW.includes("%"))) {
    additionalStyles.maxWidth = maxW;
  }
  if (maxH) additionalStyles.maxHeight = maxH;
  if (overflowY) additionalStyles.overflowY = overflowY as any;
  if (p) additionalStyles.padding = typeof p === "number" ? `${p * 0.25}rem` : p;
  if (borderRadius) additionalStyles.borderRadius = borderRadius;

  return (
    <DialogContent
      variant="glass"
      className={cn("glass-scale-in glass-accelerated", getMaxWidthClass(), className)}
      style={additionalStyles}
      {...props}
    >
      {children}
    </DialogContent>
  );
};

// For backward compatibility with existing code
export const GlassDialogBackdrop = () => null; // Radix handles backdrop automatically

export default {
  Content: GlassDialogContent,
  Backdrop: GlassDialogBackdrop,
};
