import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export type ErrorVariant = "default" | "admin" | "chat" | "food" | "compact";

export const ERROR_COPY = {
  tryAgain: "Try again",
  tryAgainTitle: "Try Again",
  goHome: "Go home",
  goHomeTitle: "Go Home",
  retryOperation: "Retry Operation",
  adminDashboard: "Admin Dashboard",
  errorIdLabel: "Error ID:",
  timestampLabel: "Timestamp:",
  chatHelpText: "If this keeps happening, try refreshing the page or check back later.",
  errorDetailsDev: "Development Mode - Error Details:",
  errorDetails: "Error Details:",
  unexpectedError: "An unexpected error occurred",
  stackTraceTitle: "Stack Trace (Development Only)",
  defaultSupportFooter: "If this problem persists, please contact support or try refreshing the page.",
  occurredAtPrefix: "Error occurred at:",
  adminTroubleshootingTitle: "Troubleshooting Steps:",
  adminSteps: [
    "Check if your admin session is still valid",
    "Verify your permissions for this operation",
    "Ensure the database connection is stable",
    "Review the error details above for more context",
  ],
  productSuggestionsTitle: "You can try:",
  productSuggestions: [
    "Refreshing the page or trying again",
    "Checking your internet connection",
    "Browsing different product categories",
    "Coming back in a few minutes",
  ],
  viewReports: "View Reports",
  emailMonitor: "Email Monitor",
  mainSite: "Main Site",
  browseByCategory: "Browse by Category:",
  categoryLinks: ["food", "things", "borrow", "wanted", "foodbanks", "fridges"],
} as const;

export interface ErrorVariantConfig {
  title: string;
  description: string;
  icon: ReactNode;
  containerClass: string;
  iconContainerClass: string;
  primaryButtonClass: string;
}

export function getVariantConfig(variant: ErrorVariant): ErrorVariantConfig {
  switch (variant) {
    case "admin":
      return {
        title: "Admin Panel Error",
        description: "An error occurred while processing your admin request",
        icon: "⚡",
        containerClass: "bg-muted/30",
        iconContainerClass: "bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30",
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
        description: "We had trouble loading the product listings. This might be a temporary issue.",
        icon: "📦",
        containerClass: "bg-gradient-to-br from-muted/30 to-background",
        iconContainerClass: "bg-primary/10",
        primaryButtonClass: "bg-primary hover:bg-primary/90 focus:ring-primary",
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
        containerClass: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20",
        iconContainerClass: "bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30",
        primaryButtonClass: "bg-primary hover:bg-primary/90 focus:ring-primary",
      };
  }
}
