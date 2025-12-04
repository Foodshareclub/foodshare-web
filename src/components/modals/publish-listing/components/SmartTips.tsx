"use client";

import React, { useState, useEffect } from "react";
import { FaLightbulb } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";

interface SmartTipsProps {
  tips: string[];
  onDismiss: () => void;
}

export const SmartTips: React.FC<SmartTipsProps> = ({ tips, onDismiss }) => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
      <FaLightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary mb-1">Tip</p>
        <p className="text-xs text-muted-foreground">{tips[currentTip]}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 rounded hover:bg-primary/10 transition-colors"
      >
        <IoMdClose className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  );
};
