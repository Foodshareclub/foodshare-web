"use client";

import React, { useState, useCallback } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags: number;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onTagsChange, maxTags }) => {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
        onTagsChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onTagsChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [inputValue, addTag, removeTag, tags]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 min-h-[42px] rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => inputValue && addTag(inputValue)}
            placeholder={tags.length === 0 ? "Add tags..." : ""}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} tags • Press Enter or comma to add
      </p>
    </div>
  );
};
