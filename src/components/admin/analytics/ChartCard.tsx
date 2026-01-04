"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/glass";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  delay?: number;
  minHeight?: string;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
  delay = 0,
  minHeight = "400px",
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      className={className}
    >
      <GlassPanel className={cn("relative overflow-hidden")} style={{ minHeight }}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </GlassPanel>
    </motion.div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-muted-foreground/50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
