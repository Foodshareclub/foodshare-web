"use client";

import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface PremiumModalProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
}

export function PremiumModal({ children, open, onOpenChange, title, description, className }: PremiumModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-background p-6 shadow-2xl",
            "animate-[scale-in_0.3s_ease-out]",
            "focus:outline-none",
            className,
          )}
        >
          {(title || description) && (
            <div className="mb-4">
              {title && (
                <DialogPrimitive.Title className="text-lg font-semibold text-foreground">{title}</DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}

          {children}

          <DialogPrimitive.Close className="absolute end-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <X className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
