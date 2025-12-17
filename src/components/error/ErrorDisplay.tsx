"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Error Display Variant Configuration
 */
export type ErrorVariant = "default" | "admin" | "chat" | "food" | "compact";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: ErrorVariant;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Show error details (defaults to dev mode only, always for admin) */
  showDetails?: boolean;
  /** Custom icon (emoji or ReactNode) */
  icon?: ReactNode;
  /** Custom home link */
  homeLink?: string;
  /** Additional action buttons */
  additionalActions?: ReactNode;
  /** Footer content (e.g., category links, troubleshooting) */
  footerContent?: ReactNode;
  /** Section badge (e.g., "ADMIN PANEL") */
  badge?: { label: string; className?: string };
  /** Primary button color class */
  primaryButtonClass?: string;
}

/**
 * Shared Error Display Component
 *
 * A configurable error boundary display that supports multiple variants
 * for different sections of the application while maintaining consistency.
 *
 * @example Default usage
 * ```tsx
 * <ErrorDisplay error={error} reset={reset} />
 * ```
 *
 * @example Admin variant
 * ```tsx
 * <ErrorDisplay error={error} reset={reset} variant="admin" />
 * ```
 */
export function ErrorDisplay({
  error,
  reset,
  variant = "default",
  title,
  description,
  showDetails,
  icon,
  homeLink = "/",
  additionalActions,
  footerContent,
  badge,
  primaryButtonClass,
}: ErrorDisplayProps) {
  // Log error on mount
  useEffect(() => {
    const prefix = variant === "admin" ? "[Admin Error]" : "[Error]";
    console.error(prefix, {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error, variant]);

  // Determine if we should show error details
  const shouldShowDetails =
    showDetails ?? (variant === "admin" || process.env.NODE_ENV === "development");

  // Get variant-specific defaults
  const config = getVariantConfig(variant);
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayIcon = icon ?? config.icon;
  const buttonClass = primaryButtonClass ?? config.primaryButtonClass;

  // Chat variant uses a different, more compact layout
  if (variant === "chat") {
    return (
      <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-destructive/10 rounded-2xl animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full bg-destructive/5 rounded-2xl border border-destructive/20">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{displayTitle}</h2>
              <p className="text-muted-foreground">{displayDescription}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground/60 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href={homeLink}>
                  <Home className="h-4 w-4" />
                  Go home
                </Link>
              </Button>
              {additionalActions}
            </div>

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
              If this keeps happening, try refreshing the page or check back later.
            </p>

            {footerContent}
          </div>
        </div>
      </div>
    );
  }

  // Compact variant for inline errors
  if (variant === "compact") {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-4">{displayDescription}</p>
        <Button onClick={reset} size="sm" variant="outline">
          Try again
        </Button>
      </div>
    );
  }

  // Default, admin, and food variants use full-page layout
  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", config.containerClass)}>
      <div className="max-w-2xl w-full">
        <div className="glass-prominent rounded-3xl p-8 md:p-12">
          {/* Badge (for admin) */}
          {badge && (
            <div className="flex justify-center mb-4">
              <span
                className={cn(
                  "text-xs font-medium px-3 py-1 rounded-full",
                  badge.className ?? "bg-green-100 text-green-800"
                )}
              >
                {badge.label}
              </span>
            </div>
          )}

          {/* Error Icon */}
          <div className="text-center mb-6">
            <div
              className={cn(
                "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
                config.iconContainerClass
              )}
            >
              {typeof displayIcon === "string" ? (
                <span className="text-4xl">{displayIcon}</span>
              ) : (
                displayIcon
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{displayTitle}</h1>
            <p className="text-lg text-muted-foreground">{displayDescription}</p>
          </div>

          {/* Error Details */}
          {shouldShowDetails && (
            <div className="mb-6">
              <div
                className={cn(
                  "border rounded-lg p-4",
                  variant === "admin"
                    ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                    : variant === "food"
                      ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                      : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{variant === "food" ? "🔍" : "🐛"}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold mb-1",
                          variant === "food"
                            ? "text-orange-800 dark:text-orange-300"
                            : "text-red-800 dark:text-red-300"
                        )}
                      >
                        {variant === "food" && process.env.NODE_ENV === "development"
                          ? "Development Mode - Error Details:"
                          : "Error Details:"}
                      </p>
                      <p
                        className={cn(
                          "text-sm break-words font-mono",
                          variant === "food"
                            ? "text-orange-700 dark:text-orange-400"
                            : "text-red-700 dark:text-red-400"
                        )}
                      >
                        {error.message || "An unexpected error occurred"}
                      </p>
                    </div>
                  </div>

                  {error.digest && (
                    <div
                      className={cn(
                        "pt-2 border-t",
                        variant === "food"
                          ? "border-orange-200 dark:border-orange-700"
                          : "border-red-200 dark:border-red-700"
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs",
                          variant === "food"
                            ? "text-orange-600 dark:text-orange-500"
                            : "text-red-600 dark:text-red-500"
                        )}
                      >
                        <span className="font-semibold">Error ID:</span> {error.digest}
                      </p>
                      {variant === "admin" && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          <span className="font-semibold">Timestamp:</span>{" "}
                          {new Date().toISOString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stack trace for development */}
                  {process.env.NODE_ENV === "development" && error.stack && (
                    <details
                      className={cn(
                        "pt-2 border-t",
                        variant === "food"
                          ? "border-orange-200 dark:border-orange-700"
                          : "border-red-200 dark:border-red-700"
                      )}
                    >
                      <summary
                        className={cn(
                          "text-xs font-semibold cursor-pointer hover:opacity-80",
                          variant === "food"
                            ? "text-orange-800 dark:text-orange-300"
                            : "text-red-800 dark:text-red-300"
                        )}
                      >
                        Stack Trace (Development Only)
                      </summary>
                      <pre
                        className={cn(
                          "text-xs mt-2 overflow-x-auto p-2 rounded",
                          variant === "food"
                            ? "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30"
                            : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                        )}
                      >
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer content (troubleshooting steps, suggestions, etc.) */}
          {footerContent}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={reset}
              className={cn(
                "flex-1 px-6 py-3 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                buttonClass
              )}
            >
              {variant === "admin" ? "🔄 Retry Operation" : "Try Again"}
            </button>
            <Link
              href={homeLink}
              className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-lg font-semibold hover:border-foreground/50 hover:shadow-md transition-all text-center focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
            >
              {variant === "admin" ? "📊 Admin Dashboard" : "Go Home"}
            </Link>
            {additionalActions}
          </div>

          {/* Timestamp footer */}
          {variant === "default" && (
            <>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  If this problem persists, please contact support or try refreshing the page.
                </p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Error occurred at: {new Date().toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get variant-specific configuration
 */
function getVariantConfig(variant: ErrorVariant) {
  switch (variant) {
    case "admin":
      return {
        title: "Admin Panel Error",
        description: "An error occurred while processing your admin request",
        icon: "⚡",
        containerClass: "bg-gray-50 dark:bg-gray-900",
        iconContainerClass:
          "bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30",
        primaryButtonClass:
          "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:ring-green-500",
      };
    case "chat":
      return {
        title: "Something went wrong",
        description: "We couldn't load your chat. This might be a temporary issue.",
        icon: <AlertCircle className="h-10 w-10 text-destructive" />,
        containerClass: "bg-background",
        iconContainerClass: "bg-destructive/10",
        primaryButtonClass: "",
      };
    case "food":
      return {
        title: "Couldn't Load Products",
        description:
          "We had trouble loading the product listings. This might be a temporary issue.",
        icon: "📦",
        containerClass: "bg-gradient-to-br from-muted/30 to-background",
        iconContainerClass: "bg-pink-100 dark:bg-pink-900/30",
        primaryButtonClass: "bg-[#FF2D55] hover:bg-[#E6284D] focus:ring-[#FF2D55]",
      };
    case "compact":
      return {
        title: "Error",
        description: "Something went wrong",
        icon: <AlertCircle className="h-6 w-6 text-destructive" />,
        containerClass: "",
        iconContainerClass: "bg-destructive/10",
        primaryButtonClass: "",
      };
    default:
      return {
        title: "Oops! Something went wrong",
        description: "We encountered an unexpected error. Don't worry, we're on it!",
        icon: "⚠️",
        containerClass:
          "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        iconContainerClass:
          "bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30",
        primaryButtonClass: "bg-[#FF2D55] hover:bg-[#E6284D] focus:ring-[#FF2D55]",
      };
  }
}

/**
 * Pre-built troubleshooting suggestions component for admin errors
 */
export function AdminTroubleshootingSteps() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">Troubleshooting Steps:</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5">•</span>
          <span>Check if your admin session is still valid</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5">•</span>
          <span>Verify your permissions for this operation</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5">•</span>
          <span>Ensure the database connection is stable</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5">•</span>
          <span>Review the error details above for more context</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * Pre-built suggestions component for product/food errors
 */
export function ProductErrorSuggestions() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3">You can try:</h3>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">•</span>
          <span>Refreshing the page or trying again</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">•</span>
          <span>Checking your internet connection</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">•</span>
          <span>Browsing different product categories</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-orange-500 mt-0.5">•</span>
          <span>Coming back in a few minutes</span>
        </li>
      </ul>
    </div>
  );
}

/**
 * Admin links footer component
 */
export function AdminLinksFooter() {
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex flex-wrap gap-2 justify-center">
        <Link
          href="/admin/reports"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          View Reports
        </Link>
        <span className="text-muted-foreground/30">|</span>
        <Link
          href="/admin/email/monitor"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Email Monitor
        </Link>
        <span className="text-muted-foreground/30">|</span>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
          Main Site
        </Link>
      </div>
    </div>
  );
}

/**
 * Product category links component
 */
export function ProductCategoryLinks() {
  const categories = ["food", "things", "borrow", "wanted", "foodbanks", "fridges"];

  return (
    <div className="mt-6">
      <div className="glass-subtle rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Browse by Category:</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/food?type=${category}`}
              className="px-4 py-2 bg-card border border-border rounded-full text-sm text-foreground hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-sm transition-all capitalize"
            >
              {category}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
