"use client";

import React, { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches shader compilation failures, GPU device losses, and vgpu runtime errors.
 * Renders a graceful fallback instead of crashing the app.
 */
export class GPUErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV === "production") {
      console.error("[GPU Error]", error, info.componentStack);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-orange-500/5 to-red-500/5" />
        )
      );
    }
    return this.props.children;
  }
}
