"use client";

/**
 * TabPanel - Animated wrapper for tab content
 * Provides smooth enter/exit animations for dashboard tabs
 */

import { motion } from "framer-motion";
import { TAB_PANEL_VARIANTS, TAB_PANEL_TRANSITION } from "../constants";

interface TabPanelProps {
  children: React.ReactNode;
}

export function TabPanel({ children }: TabPanelProps) {
  return (
    <motion.div
      initial={TAB_PANEL_VARIANTS.initial}
      animate={TAB_PANEL_VARIANTS.animate}
      exit={TAB_PANEL_VARIANTS.exit}
      transition={TAB_PANEL_TRANSITION}
    >
      {children}
    </motion.div>
  );
}
