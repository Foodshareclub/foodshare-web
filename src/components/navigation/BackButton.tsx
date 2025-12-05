'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  className?: string;
  label?: string;
}

/**
 * BackButton - Client component for browser history navigation
 * Extracted to allow parent pages to remain Server Components
 */
export function BackButton({ className, label = 'Go Back' }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      onClick={() => window.history.back()}
      className={cn('gap-2', className)}
    >
      <span>←</span>
      <span>{label}</span>
    </Button>
  );
}
