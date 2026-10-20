"use client";

import type React from "react";

interface AriaAnnouncerProps {
  message: string;
}

export const AriaAnnouncer: React.FC<AriaAnnouncerProps> = ({ message }) => (
  <output aria-live="polite" aria-atomic="true" className="sr-only">
    {message}
  </output>
);
