"use client";

import { Keyboard } from "lucide-react";
import { Glass } from "@/components/ui/glass";

export function KeyboardShortcutsHint() {
  return (
    <Glass variant="subtle" className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Keyboard className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Keyboard shortcuts</p>
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">⌘</kbd> +{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">,</kbd> to open
            settings
          </p>
        </div>
      </div>
    </Glass>
  );
}
