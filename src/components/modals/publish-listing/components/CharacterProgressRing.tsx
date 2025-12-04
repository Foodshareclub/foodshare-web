"use client";

import React from "react";

interface CharacterProgressRingProps {
  current: number;
  max: number;
  size?: number;
}

export const CharacterProgressRing: React.FC<CharacterProgressRingProps> = ({
  current,
  max,
  size = 32,
}) => {
  const percentage = Math.min((current / max) * 100, 100);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 95) return "text-red-500";
    if (percentage >= 80) return "text-orange-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`transition-all duration-300 ${getColor()}`}
        />
      </svg>
      <span className={`absolute text-[9px] font-medium tabular-nums ${getColor()}`}>
        {max - current}
      </span>
    </div>
  );
};
