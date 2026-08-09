"use client";

import React from "react";
import { RequiredStar } from "@/components";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoryConfig, conditionOptions, MAX_DESCRIPTION_LENGTH } from "../constants";
import { VoiceInput, TitleSuggestions, CharacterProgressRing } from "../components";

interface BasicDetailsStepProps {
  category: string;
  onCategoryChange: (category: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  condition?: string;
  onConditionChange: (condition: string) => void;
  showCategoryError?: boolean;
  showTitleError?: boolean;
  onVoiceTranscript: (transcript: string) => void;
  onTitleSuggestionSelect: (suggestion: string) => void;
}

export function BasicDetailsStep({
  category,
  onCategoryChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  condition,
  onConditionChange,
  showCategoryError,
  showTitleError,
  onVoiceTranscript,
  onTitleSuggestionSelect,
}: BasicDetailsStepProps) {
  const selectedCategoryConfig = category
    ? categoryConfig[category as keyof typeof categoryConfig]
    : null;
  const titlePlaceholder = selectedCategoryConfig?.placeholders?.title || "What is it called";
  const descriptionPlaceholder =
    selectedCategoryConfig?.placeholders?.description || "A few words about...";

  return (
    <div className="space-y-4">
      {/* Category Select */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          Category
          <RequiredStar />
        </Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger variant="glass" className={showCategoryError ? "border-destructive" : ""}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={key} value={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{config.label}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Title Input */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            Title
            <RequiredStar />
          </span>
        </Label>
        <div className="relative">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
            className={showTitleError ? "border-destructive pr-8" : "pr-8"}
          />
        </div>
        {category && (
          <TitleSuggestions
            category={category}
            currentTitle={title}
            onSelect={onTitleSuggestionSelect}
          />
        )}
      </div>

      {/* Description Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Description</Label>
          <div className="flex items-center gap-2">
            <VoiceInput onTranscript={onVoiceTranscript} />
            <CharacterProgressRing current={description.length} max={MAX_DESCRIPTION_LENGTH} />
          </div>
        </div>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
          placeholder={descriptionPlaceholder}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Item Condition */}
      <div className="space-y-2">
        <Label>Condition</Label>
        <Select value={condition || ""} onValueChange={onConditionChange}>
          <SelectTrigger variant="glass">
            <SelectValue placeholder="Select condition (optional)" />
          </SelectTrigger>
          <SelectContent>
            {conditionOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
