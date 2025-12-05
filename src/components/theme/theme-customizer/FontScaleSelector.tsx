'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FONT_SCALES, type FontScale } from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';

interface FontScaleSelectorProps {
  current: FontScale;
  onChange: (scale: FontScale) => void;
}

export function FontScaleSelector({ current, onChange }: FontScaleSelectorProps) {
    const scales = Object.entries(FONT_SCALES) as [
      FontScale,
      { label: string; multiplier: number }
    ][];

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          {scales.map(([scale, config]) => (
            <motion.button
              key={scale}
              onClick={() => onChange(scale)}
              className={cn(
                'flex-1 py-2 px-1 rounded-lg border-2 transition-all text-center',
                current === scale
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span
                className="block font-medium"
                style={{ fontSize: `${config.multiplier * 0.875}rem` }}
              >
                Aa
              </span>
            </motion.button>
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          {FONT_SCALES[current].label}
        </div>
      </div>
    );
}
