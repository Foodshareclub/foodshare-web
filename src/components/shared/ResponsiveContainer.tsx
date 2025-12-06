'use client';

import React, { useState, type ReactNode } from 'react';
import { useMediaQuery } from '@/hooks';
import UniversalDrawer, { type PlacementType } from '@/components/universalDrawer/UniversalDrawer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type ResponsiveContainerProps = {
  children: ReactNode;
  /** Breakpoint for switching between drawer and inline (default: 1200px) */
  breakpoint?: string;
  /** Drawer placement when in mobile mode */
  drawerPlacement?: PlacementType;
  /** Drawer size */
  drawerSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Custom trigger button */
  trigger?: ReactNode;
  /** Trigger button position */
  triggerPosition?: 'left' | 'right';
  /** Trigger button icon */
  triggerIcon?: ReactNode;
  /** Additional class for the container */
  className?: string;
  /** Drawer header */
  drawerHeader?: string;
};

// ============================================================================
// Default Icons
// ============================================================================

const ArrowRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

/**
 * ResponsiveContainer - Shows content inline on desktop, in drawer on mobile
 * Consolidates ContactsBlockDrawerContainer and OneProductDrawerContainer patterns
 */
export function ResponsiveContainer({
  children,
  breakpoint = '(min-width: 1200px)',
  drawerPlacement = 'start',
  drawerSize = 'md',
  trigger,
  triggerPosition = 'left',
  triggerIcon,
  className,
  drawerHeader,
}: ResponsiveContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery(breakpoint);

  // Default icon based on placement
  const defaultIcon =
    drawerPlacement === 'start' || drawerPlacement === 'top' ? (
      <ArrowRightIcon />
    ) : (
      <ArrowLeftIcon />
    );

  const icon = triggerIcon ?? defaultIcon;

  // Desktop: render inline
  if (isDesktop) {
    return <div className={className}>{children}</div>;
  }

  // Mobile: render with drawer
  return (
    <>
      {/* Trigger Button */}
      {trigger ?? (
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed w-11 h-11 rounded-full z-10 bg-orange-500 hover:bg-orange-600',
            triggerPosition === 'left' ? 'left-[-10px]' : 'right-4'
          )}
          size="icon"
        >
          {icon}
        </Button>
      )}

      {/* Drawer */}
      <UniversalDrawer
        onClose={() => setIsOpen(false)}
        isOpen={isOpen}
        size={drawerSize}
        placement={drawerPlacement}
        headerValue={drawerHeader}
      >
        {children}
      </UniversalDrawer>
    </>
  );
}

export default ResponsiveContainer;
