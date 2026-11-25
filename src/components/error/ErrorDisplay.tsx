"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { ERROR_COPY, type ErrorVariant, getVariantConfig } from "./error-variants";

export type { ErrorVariant };
export {
  AdminTroubleshootingSteps,
  ProductErrorSuggestions,
  AdminLinksFooter,
  ProductCategoryLinks,
} from "./ErrorSuggestions";

interface ErrorDisplayProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: ErrorVariant;
  title?: string;
  description?: string;
  showDetails?: boolean;
  icon?: ReactNode;
  homeLink?: string;
  additionalActions?: ReactNode;
  footerContent?: ReactNode;
  badge?: { label: string; className?: string };
  primaryButtonClass?: string;
}

function readInstant(): string {
  return new Date().toISOString();
}

function serverSnapshot(): null {
  return null;
}

function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Shared configurable error boundary display supporting multiple app sections.
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
  const occurredAt = useSyncExternalStore(subscribeToNothing, readInstant, serverSnapshot);

  useEffect(() => {
    const prefix = variant === "admin" ? "[Admin Error]" : "[Error]";
    console.error(prefix, {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: readInstant(),
    });
  }, [error, variant]);

  const shouldShowDetails = showDetails ?? (variant === "admin" || process.env.NODE_ENV === "development");
  const config = getVariantConfig(variant);
  const displayTitle = title ?? config.title;
  const displayDescription = description ?? config.description;
  const displayIcon = icon ?? config.icon;
  const buttonClass = primaryButtonClass ?? config.primaryButtonClass;

  if (variant === "chat") {
    return (
      <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-destructive/10 rounded-2xl animate-pulse" />
              <div className="relative flex items-center justify-center w-full h-full bg-destructive/5 rounded-2xl border border-destructive/20">
                <AlertCircle className="h-10 w-10 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{displayTitle}</h2>
              <p className="text-muted-foreground">{displayDescription}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground/60 font-mono">
                  {ERROR_COPY.errorIdLabel} {error.digest}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                {ERROR_COPY.tryAgain}
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href={homeLink}>
                  <Home className="h-4 w-4" />
                  {ERROR_COPY.goHome}
                </Link>
              </Button>
              {additionalActions}
            </div>

            <p className="text-xs text-muted-foreground">{ERROR_COPY.chatHelpText}</p>
            {footerContent}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-4">{displayDescription}</p>
        <Button onClick={reset} size="sm" variant="outline">
          {ERROR_COPY.tryAgain}
        </Button>
      </div>
    );
  }

  const isFoodVariant = variant === "food";

  return (
    <div className={cn("min-h-screen flex items-center justify-center p-4", config.containerClass)}>
      <div className="max-w-2xl w-full">
        <div className="glass-prominent rounded-3xl p-8 md:p-12">
          {badge && (
            <div className="flex justify-center mb-4">
              <span
                className={cn(
                  "text-xs font-medium px-3 py-1 rounded-full",
                  badge.className ?? "bg-green-100 text-green-800",
                )}
              >
                {badge.label}
              </span>
            </div>
          )}

          <div className="text-center mb-6">
            <div
              className={cn(
                "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
                config.iconContainerClass,
              )}
            >
              {typeof displayIcon === "string" ? <span className="text-4xl">{displayIcon}</span> : displayIcon}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{displayTitle}</h1>
            <p className="text-lg text-muted-foreground">{displayDescription}</p>
          </div>

          {shouldShowDetails && (
            <div className="mb-6">
              <div
                className={cn(
                  "border rounded-lg p-4",
                  isFoodVariant
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{isFoodVariant ? "🔍" : "🐛"}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-semibold mb-1",
                          isFoodVariant ? "text-orange-800 dark:text-orange-300" : "text-red-800 dark:text-red-300",
                        )}
                      >
                        {isFoodVariant && process.env.NODE_ENV === "development"
                          ? ERROR_COPY.errorDetailsDev
                          : ERROR_COPY.errorDetails}
                      </p>
                      <p
                        className={cn(
                          "text-sm break-words font-mono",
                          isFoodVariant ? "text-orange-700 dark:text-orange-400" : "text-red-700 dark:text-red-400",
                        )}
                      >
                        {error.message || ERROR_COPY.unexpectedError}
                      </p>
                    </div>
                  </div>

                  {error.digest && (
                    <div
                      className={cn(
                        "pt-2 border-t",
                        isFoodVariant
                          ? "border-orange-200 dark:border-orange-700"
                          : "border-red-200 dark:border-red-700",
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs",
                          isFoodVariant ? "text-orange-600 dark:text-orange-500" : "text-red-600 dark:text-red-500",
                        )}
                      >
                        <span className="font-semibold">{ERROR_COPY.errorIdLabel}</span> {error.digest}
                      </p>
                      {variant === "admin" && (
                        <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                          <span className="font-semibold">{ERROR_COPY.timestampLabel}</span> {occurredAt}
                        </p>
                      )}
                    </div>
                  )}

                  {process.env.NODE_ENV === "development" && error.stack && (
                    <details
                      className={cn(
                        "pt-2 border-t",
                        isFoodVariant
                          ? "border-orange-200 dark:border-orange-700"
                          : "border-red-200 dark:border-red-700",
                      )}
                    >
                      <summary
                        className={cn(
                          "text-xs font-semibold cursor-pointer hover:opacity-80",
                          isFoodVariant ? "text-orange-800 dark:text-orange-300" : "text-red-800 dark:text-red-300",
                        )}
                      >
                        {ERROR_COPY.stackTraceTitle}
                      </summary>
                      <pre
                        className={cn(
                          "text-xs mt-2 overflow-x-auto p-2 rounded",
                          isFoodVariant
                            ? "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30"
                            : "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
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

          {footerContent}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={reset}
              className={cn(
                "flex-1 px-6 py-3 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                buttonClass,
              )}
            >
              {variant === "admin" ? ERROR_COPY.retryOperation : ERROR_COPY.tryAgainTitle}
            </button>
            <Link
              href={homeLink}
              className="flex-1 px-6 py-3 bg-card border-2 border-border text-foreground rounded-lg font-semibold hover:border-foreground/50 hover:shadow-md transition-all text-center focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
            >
              {variant === "admin" ? ERROR_COPY.adminDashboard : ERROR_COPY.goHomeTitle}
            </Link>
            {additionalActions}
          </div>

          {variant === "default" && (
            <>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">{ERROR_COPY.defaultSupportFooter}</p>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {ERROR_COPY.occurredAtPrefix} {occurredAt}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
