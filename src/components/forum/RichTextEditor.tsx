"use client";

/**
 * RichTextEditor - Tiptap-based rich text editor for forum
 * Wrapper around the shared rich-text-editor component
 */

import { FeatureErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useCallback } from "react";
import { RichTextViewer } from "./RichTextViewer";

const TiptapEditor = dynamic(() => import("@/components/ui/rich-text-editor").then((mod) => mod.RichTextEditor), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center border border-border rounded-lg p-8 text-sm text-muted-foreground animate-pulse">
      Loading editor...
    </div>
  ),
});

type RichTextEditorProps = {
  content?: string;
  placeholder?: string;
  onChange?: (content: string, json: Record<string, unknown>) => void;
  editable?: boolean;
  className?: string;
  minHeight?: string;
};

export function RichTextEditor({
  content = "",
  placeholder = "Write something...",
  onChange,
  editable = true,
  className,
  minHeight = "150px",
}: RichTextEditorProps) {
  const handleChange = useCallback(
    (html: string) => {
      // Pass empty object for json - HTML is the source of truth
      onChange?.(html, {});
    },
    [onChange],
  );

  if (!editable) {
    return (
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none p-4",
          "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-blockquote:my-2",
          "prose-headings:font-semibold prose-h2:text-xl prose-h3:text-lg",
          "border border-border rounded-lg overflow-hidden bg-background",
          className,
        )}
        style={{ minHeight }}
      >
        <RichTextViewer content={content} />
      </div>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Rich Text Editor">
      <TiptapEditor
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        minHeight={minHeight}
      />
    </FeatureErrorBoundary>
  );
}
