"use client";

import React from "react";
import { BarChart3, Lightbulb, X } from "lucide-react";

interface QualityScoreProps {
  score: number;
  suggestions: string[];
  onClose: () => void;
}

export const QualityScore: React.FC<QualityScoreProps> = ({ score, suggestions, onClose }) => {
  const getScoreColor = () => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="p-4 rounded-lg bg-muted/50 space-y-3 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${score} 100`}
                className={getScoreColor()}
                strokeLinecap="round"
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor()}`}
            >
              {score}
            </span>
          </div>
          <div>
            <p className="font-medium flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Listing Quality
            </p>
            <p className={`text-sm ${getScoreColor()}`}>{getScoreLabel()}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Tips to improve:</p>
          <ul className="space-y-1">
            {suggestions.slice(0, 3).map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
