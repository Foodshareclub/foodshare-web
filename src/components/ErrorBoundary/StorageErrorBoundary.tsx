import type { ReactNode } from "react";
import React, { Component } from "react";
import { detectStorageError, clearSupabaseStorage } from "@/utils/storageErrorHandler";
import { Button } from "@/components/ui/button";
import { FaExclamationCircle } from 'react-icons/fa';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

/**
 * Error Boundary that catches storage-related errors and provides recovery UI
 */
export class StorageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a storage-related error
    const storageError = detectStorageError(error);
    if (storageError) {
      return {
        hasError: true,
        error,
        isRecovering: false,
      };
    }
    // Not a storage error, don't catch it
    throw error;
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const storageError = detectStorageError(error);
    if (storageError) {
      console.error("Storage Error Boundary caught error:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        storageError,
      });
    }
  }

  handleClearStorage = async () => {
    this.setState({ isRecovering: true });
    try {
      const success = await clearSupabaseStorage();
      if (success) {
        // Reload the page to reinitialize with clean storage
        window.location.reload();
      } else {
        alert("Failed to clear storage. Please manually clear your browser cache.");
      }
    } catch (error) {
      console.error("Storage recovery failed:", error);
      alert("Failed to clear storage. Please manually clear your browser cache.");
    } finally {
      this.setState({ isRecovering: false });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      const storageError = detectStorageError(this.state.error);

      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-[600px] w-full p-6 rounded-lg border-2 border-red-500/30 bg-red-500/10 dark:bg-red-500/5">
            <div className="flex items-start gap-4">
              <FaExclamationCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex flex-col gap-3 flex-1">
                <h2 className="text-xl font-bold text-foreground">Application Storage Error</h2>
                <div className="space-y-3">
                  <p className="text-red-800 dark:text-red-300 mb-2">
                    {storageError?.message || "An error occurred with browser storage."}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    {storageError?.userGuidance ||
                      "Please clear your browser cache and reload the page."}
                  </p>

                  <div className="flex gap-2">
                    {storageError?.canRecover && (
                      <Button
                        variant="destructive"
                        onClick={this.handleClearStorage}
                        disabled={this.state.isRecovering}
                      >
                        {this.state.isRecovering ? "Clearing..." : "Clear Storage & Reload"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={this.handleReload}
                      disabled={this.state.isRecovering}
                    >
                      Reload Page
                    </Button>
                  </div>

                  {!storageError?.canRecover && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      This issue cannot be automatically recovered. Please check your browser
                      settings or try using a regular browser window (not private/incognito).
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default StorageErrorBoundary;
