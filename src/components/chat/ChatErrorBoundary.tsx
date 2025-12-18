"use client";

/**
 * ChatErrorBoundary Component
 * Catches errors in chat components and provides graceful degradation
 */

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (could send to error tracking service)
    console.error("[ChatErrorBoundary] Error caught:", error);
    console.error("[ChatErrorBoundary] Error info:", errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            There was an error loading the chat. This might be a temporary issue.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Reload page
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 text-left w-full max-w-lg">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Error details (dev only)
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for individual chat components
 * Falls back to a simple retry button
 */
export function ChatComponentErrorBoundary({
  children,
  componentName = "component",
}: {
  children: ReactNode;
  componentName?: string;
}) {
  return (
    <ChatErrorBoundary
      fallback={
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Failed to load {componentName}</span>
        </div>
      }
    >
      {children}
    </ChatErrorBoundary>
  );
}
