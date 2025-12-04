"use client";

import React from "react";

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => (
  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out"
      style={{ width: `${progress}%` }}
    />
  </div>
);
