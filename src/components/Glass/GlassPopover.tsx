import React from "react";
import { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * GlassPopoverContent - Glassmorphism wrapper for Popover Content
 */
export const GlassPopoverContent: React.FC<
  React.ComponentPropsWithoutRef<typeof PopoverContent>
> = ({ children, className, ...props }) => {
  return (
    <PopoverContent
      variant="glass"
      className={cn("glass-transition glass-accelerated", className)}
      {...props}
    >
      {children}
    </PopoverContent>
  );
};

// Arrow is not needed with Radix UI Popover
export const GlassPopoverArrow = () => null;

export default GlassPopoverContent;
