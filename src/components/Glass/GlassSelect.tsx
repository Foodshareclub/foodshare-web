import React from "react";
import { SelectTrigger, SelectContent } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * GlassSelectTrigger - Glassmorphism wrapper for Select Trigger
 */
export const GlassSelectTrigger: React.FC<React.ComponentPropsWithoutRef<typeof SelectTrigger>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <SelectTrigger variant="glass" className={cn("glass-transition", className)} {...props}>
      {children}
    </SelectTrigger>
  );
};

/**
 * GlassSelectContent - Glassmorphism wrapper for Select Content
 */
export const GlassSelectContent: React.FC<React.ComponentPropsWithoutRef<typeof SelectContent>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <SelectContent
      variant="glass"
      className={cn("glass-transition glass-accelerated", className)}
      {...props}
    >
      {children}
    </SelectContent>
  );
};

// For backward compatibility
export const GlassSelectRoot = GlassSelectTrigger;
export const GlassSelectField = GlassSelectTrigger;

export const GlassSelect = {
  Root: GlassSelectRoot,
  Field: GlassSelectField,
  Trigger: GlassSelectTrigger,
  Content: GlassSelectContent,
};

export default {
  Trigger: GlassSelectTrigger,
  Content: GlassSelectContent,
};
