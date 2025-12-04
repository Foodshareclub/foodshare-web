"use client";

import React from "react";

interface AriaAnnouncerProps {
  message: string;
}

export const AriaAnnouncer: React.FC<AriaAnnouncerProps> = ({ message }) => (
  <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
    {message}
  </div>
);
