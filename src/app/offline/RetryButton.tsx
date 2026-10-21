"use client";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  return (
    <Button onClick={() => window.location.reload()} className="min-w-[120px]">
      Try again
    </Button>
  );
}
