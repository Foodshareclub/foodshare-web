'use client';

import React, { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AccentColorConfig } from '@/store/zustand/useUIStore';
import { ACCENT_COLORS, hexToHSL, hslToHex } from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';
import { CheckIcon } from './icons';

interface AccentColorPickerProps {
  current: AccentColorConfig;
  onChange: (color: AccentColorConfig) => void;
}

export const AccentColorPicker: React.FC<AccentColorPickerProps> = memo(
  ({ current, onChange }) => {
    const [showCustom, setShowCustom] = useState(false);
    const [customHex, setCustomHex] = useState(
      current.customHex || hslToHex(current.hue, current.saturation, 50)
    );

    const handleCustomChange = useCallback(
      (hex: string) => {
        setCustomHex(hex);
        const hsl = hexToHSL(hex);
        onChange({
          name: 'custom',
          hue: hsl.h,
          saturation: hsl.s,
          customHex: hex,
        });
      },
      [onChange]
    );

    return (
      <div className="space-y-4">
        {/* Preset Colors */}
        <div className="flex flex-wrap gap-3">
          {Object.values(ACCENT_COLORS).map((color) => (
            <motion.button
              key={color.name}
              onClick={() => onChange(color)}
              className={cn(
                'relative w-10 h-10 rounded-full transition-all',
                'ring-2 ring-offset-2 ring-offset-background',
                current.name === color.name
                  ? 'ring-foreground scale-110'
                  : 'ring-transparent hover:ring-muted-foreground/50'
              )}
              style={{
                backgroundColor: hslToHex(color.hue, color.saturation, 50),
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              title={color.name}
            >
              {current.name === color.name && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center text-white"
                >
                  <CheckIcon />
                </motion.span>
              )}
            </motion.button>
          ))}

          {/* Custom color button */}
          <motion.button
            onClick={() => setShowCustom(!showCustom)}
            className={cn(
              'relative w-10 h-10 rounded-full transition-all overflow-hidden',
              'ring-2 ring-offset-2 ring-offset-background',
              current.name === 'custom'
                ? 'ring-foreground scale-110'
                : 'ring-transparent hover:ring-muted-foreground/50'
            )}
            style={{
              background:
                current.name === 'custom'
                  ? customHex
                  : 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Custom color"
          >
            {current.name === 'custom' && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center text-white"
              >
                <CheckIcon />
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Custom Color Input */}
        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Custom Color
                  </label>
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    placeholder="#22c55e"
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-mono"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AccentColorPicker.displayName = 'AccentColorPicker';
