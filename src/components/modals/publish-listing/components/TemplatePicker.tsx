"use client";

import React from "react";
import { FaFileAlt } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { templatePresets } from "../constants";

interface TemplatePickerProps {
  category: string;
  onSelect: (template: { title: string; description: string; tags: string[] }) => void;
  onClose: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ category, onSelect, onClose }) => {
  const templates =
    category && category in templatePresets
      ? templatePresets[category as keyof typeof templatePresets]
      : [];

  if (templates.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-2">
          <FaFileAlt className="h-4 w-4 text-muted-foreground" />
          Quick Templates
        </p>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <IoMdClose className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() =>
              onSelect({
                title: template.title,
                description: template.description,
                tags: [...template.tags],
              })
            }
            className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
          >
            <span className="text-xl">{template.icon}</span>
            <span className="text-sm font-medium">{template.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
