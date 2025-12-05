'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { ContrastMode } from '@/store/zustand/useUIStore';
import { CONTRAST_MODES } from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';

interface ContrastSelectorProps {
  current: ContrastMode;
  onChange: (mode: ContrastMode) => void;
}

export function ContrastSelector({ current, onChange }: ContrastSelectorProps) {
  return (
    <div className="flex gap-2">
      {Object.values(CONTRAST_MODES).map((mode) => (
        <motion.button
          key={mode.id}
          onClick={() => onChange(mode.id)}
          className={cn(
            'flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all',
            current === mode.id
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className={cn(
              'w-6 h-6 rounded border-2',
              mode.id === 'high' && 'border-foreground bg-foreground/20',
              mode.id === 'normal' && 'border-muted-foreground bg-muted',
              mode.id === 'reduced' && 'border-muted bg-muted/50'
            )}
          />
          <span className="text-xs font-medium">{mode.name}</span>
        </motion.button>
      ))}
    </div>
  );
}
