'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { COLOR_BLINDNESS_MODES, type ColorBlindnessMode } from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';
import { CheckIcon } from './icons';

interface ColorBlindnessSelectorProps {
  current: ColorBlindnessMode;
  onChange: (mode: ColorBlindnessMode) => void;
}

export function ColorBlindnessSelector({ current, onChange }: ColorBlindnessSelectorProps) {
    const modes = Object.values(COLOR_BLINDNESS_MODES);

    return (
      <div className="space-y-2">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
              current === mode.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Color preview circles */}
            <div className="flex gap-1">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor:
                    mode.id === 'none'
                      ? '#ef4444'
                      : mode.id === 'achromatopsia'
                        ? '#888'
                        : '#ef4444',
                  filter:
                    mode.id !== 'none' && mode.id !== 'achromatopsia'
                      ? `url(#${mode.id}-filter)`
                      : mode.id === 'achromatopsia'
                        ? 'grayscale(100%)'
                        : 'none',
                }}
              />
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor:
                    mode.id === 'none'
                      ? '#22c55e'
                      : mode.id === 'achromatopsia'
                        ? '#888'
                        : '#22c55e',
                  filter:
                    mode.id !== 'none' && mode.id !== 'achromatopsia'
                      ? `url(#${mode.id}-filter)`
                      : mode.id === 'achromatopsia'
                        ? 'grayscale(100%)'
                        : 'none',
                }}
              />
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor:
                    mode.id === 'none'
                      ? '#3b82f6'
                      : mode.id === 'achromatopsia'
                        ? '#888'
                        : '#3b82f6',
                  filter:
                    mode.id !== 'none' && mode.id !== 'achromatopsia'
                      ? `url(#${mode.id}-filter)`
                      : mode.id === 'achromatopsia'
                        ? 'grayscale(100%)'
                        : 'none',
                }}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{mode.name}</p>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </div>
            {current === mode.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground"
              >
                <CheckIcon />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    );
  }
);

ColorBlindnessSelector.displayName = 'ColorBlindnessSelector';
