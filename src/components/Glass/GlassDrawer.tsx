import React from "react";
import { DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * GlassDrawerContent - Glassmorphism wrapper for Drawer Content
 */
export const GlassDrawerContent: React.FC<{
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}> = ({ children, className, ...props }) => {
  return (
    <DrawerContent variant="glass" className={cn("glass-accelerated", className)} {...props as any}>
      {children}
    </DrawerContent>
  );
};

// For backward compatibility with existing code
export const GlassDrawerBackdrop = () => null; // Radix handles backdrop automatically

export default GlassDrawerContent;
