'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { THEME_PRESETS, previewTheme } from '@/lib/theme/themeConfig';
import { cn } from '@/lib/utils';
import { CheckIcon } from './icons';

interface PresetCardProps {
  preset: (typeof THEME_PRESETS)[keyof typeof THEME_PRESETS];
  isActive: boolean;
  onClick: () => void;
  enablePreview?: boolean;
}

export function PresetCard({ preset, isActive, onClick, enablePreview = true }: PresetCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const previewCleanupRef = useRef<(() => void) | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (enablePreview && !isActive) {
      previewCleanupRef.current = previewTheme(preset, preset.prefersDark || false);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (previewCleanupRef.current) {
      previewCleanupRef.current();
      previewCleanupRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewCleanupRef.current) {
        previewCleanupRef.current();
      }
    };
  }, []);

    return (
      <motion.button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative flex flex-col p-3 rounded-xl border-2 transition-all text-left w-full overflow-hidden',
          isActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 bg-card'
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Animated gradient background on hover */}
        <AnimatePresence>
          {isHovered && !isActive && (
            <motion.div
              className="absolute inset-0 opacity-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0 }}
              style={{
                background: `linear-gradient(135deg, ${preset.preview.primary} 0%, ${preset.preview.secondary} 50%, ${preset.preview.accent} 100%)`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Preview with animated shimmer */}
        <div
          className="relative w-full h-16 rounded-lg mb-2 overflow-hidden"
          style={{ backgroundColor: preset.preview.background }}
        >
          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={
              isHovered
                ? {
                    background: [
                      `linear-gradient(90deg, transparent 0%, ${preset.preview.primary}40 50%, transparent 100%)`,
                      `linear-gradient(90deg, transparent 100%, ${preset.preview.primary}40 150%, transparent 200%)`,
                    ],
                    x: ['-100%', '100%'],
                  }
                : {}
            }
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />

          {/* Mini preview elements */}
          <motion.div
            className="absolute top-2 left-2 w-8 h-2 rounded"
            style={{ backgroundColor: preset.preview.primary }}
            animate={isHovered ? { width: [32, 40, 32] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-2 right-2 w-4 h-4 rounded-full"
            style={{ backgroundColor: preset.preview.accent }}
            animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <div
            className="absolute bottom-2 left-2 right-2 h-3 rounded"
            style={{ backgroundColor: preset.preview.secondary, opacity: 0.3 }}
          />
        </div>

        <span className="font-semibold text-sm relative z-10">{preset.name}</span>
        <span className="text-xs text-muted-foreground line-clamp-1 relative z-10">
          {preset.description}
        </span>

        {/* Selection indicator */}
        {isActive && (
          <motion.div
            className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground z-20"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <CheckIcon />
          </motion.div>
        )}
      </motion.button>
    );
}
