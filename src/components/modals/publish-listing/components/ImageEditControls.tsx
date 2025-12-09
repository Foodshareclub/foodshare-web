"use client";

import React from "react";
import { RotateCw, FlipHorizontal, FlipVertical } from "lucide-react";

interface ImageEditControlsProps {
  onRotate: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
}

export const ImageEditControls: React.FC<ImageEditControlsProps> = ({
  onRotate,
  onFlipH,
  onFlipV,
}) => (
  <div className="absolute bottom-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRotate();
      }}
      className="p-1 bg-black/60 rounded hover:bg-black/80 transition-colors"
      title="Rotate"
    >
      <RotateCw className="h-3 w-3 text-white" />
    </button>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFlipH();
      }}
      className="p-1 bg-black/60 rounded hover:bg-black/80 transition-colors"
      title="Flip horizontal"
    >
      <FlipHorizontal className="h-3 w-3 text-white" />
    </button>
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onFlipV();
      }}
      className="p-1 bg-black/60 rounded hover:bg-black/80 transition-colors"
      title="Flip vertical"
    >
      <FlipVertical className="h-3 w-3 text-white" />
    </button>
  </div>
);
