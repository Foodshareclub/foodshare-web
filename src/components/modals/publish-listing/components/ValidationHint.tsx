"use client";

import React from "react";
import { FaBolt, FaBullseye } from "react-icons/fa";

interface ValidationHintProps {
  field: string;
  value: string;
  minLength?: number;
  isValid: boolean;
}

export const ValidationHint: React.FC<ValidationHintProps> = ({
  field,
  value,
  minLength,
  isValid,
}) => {
  if (isValid || !value) return null;

  const hints: Record<string, string[]> = {
    title: [
      "Start with what the item is",
      "Include key details (brand, size, color)",
      "Keep it concise but descriptive",
    ],
    description: [
      "Explain why you're sharing it",
      "Mention the condition",
      "Add pickup/availability details",
    ],
  };

  const fieldHints = hints[field] || [];
  const lengthHint =
    minLength && value.length < minLength
      ? `Add ${minLength - value.length} more characters`
      : null;

  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-1 duration-200">
      <FaBullseye className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        {lengthHint && <p className="text-xs text-amber-700 font-medium">{lengthHint}</p>}
        {fieldHints.length > 0 && (
          <ul className="text-xs text-amber-600/80 space-y-0.5">
            {fieldHints.slice(0, 2).map((hint, i) => (
              <li key={i} className="flex items-center gap-1">
                <FaBolt className="h-2.5 w-2.5" />
                {hint}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
